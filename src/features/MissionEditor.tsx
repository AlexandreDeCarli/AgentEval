import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMissionStore, defaultMockMission } from '../store/useMissionStore';
import { useProjectStore } from '../store/useProjectStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToastStore } from '../store/useToastStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Mission } from '../types';
import { generateMissionsFromAI } from '../services/missionGenerator';
import { UnsavedChangesModal } from '../components/ui/UnsavedChangesModal';
import { ArrowLeft, Save, Compass, Sparkles, Server, Target, FileText, Eye } from 'lucide-react';
import {
    DEFAULT_GEMINI_TARGET_MODEL,
    getMissionGeminiModel,
    getMissionTargetProvider,
    getProjectGeminiModel,
    getProjectTargetProvider,
} from '../utils/missionTarget';

// Import modular components
import { AiMissionGenerator } from './mission-editor/components/AiMissionGenerator';
import { MissionIntegrationTab } from './mission-editor/components/MissionIntegrationTab';
import { MissionGoalTab } from './mission-editor/components/MissionGoalTab';
import { MissionVariablesTab } from './mission-editor/components/MissionVariablesTab';
import { MissionCriteriaTab } from './mission-editor/components/MissionCriteriaTab';

type MissionTab = 'integration' | 'goal' | 'variables' | 'criteria';

const normalizeMission = (mission: Mission): Mission => {
    if (mission.project_id) {
        const projectMission = { ...mission };
        delete projectMission.target_provider;
        delete projectMission.target_gemini_model;
        return projectMission;
    }

    return {
        ...mission,
        target_provider: getMissionTargetProvider(mission),
        target_gemini_model: getMissionGeminiModel(mission),
    };
};

export const MissionEditor: React.FC = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { missions, addMission, updateMission } = useMissionStore();
    const { projects } = useProjectStore();

    const isNew = id === 'new';
    const projectIdFromQuery = searchParams.get('project') || '';
    const { geminiApiKey } = useSettingsStore();

    const [creationMethod, setCreationMethod] = useState<'select' | 'manual' | 'ai'>(isNew ? 'select' : 'manual');
    const [activeTab, setActiveTab] = useState<MissionTab>('goal');
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiCount, setAiCount] = useState(8);
    const [selectedAiPromptIds, setSelectedAiPromptIds] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [genError, setGenError] = useState('');
    const addToast = useToastStore((state) => state.addToast);

    const [formData, setFormData] = useState<Mission>({
        id: crypto.randomUUID(),
        project_id: projectIdFromQuery,
        environment_id: '',
        system_prompt_id: '',
        target_provider: 'http',
        target_gemini_model: DEFAULT_GEMINI_TARGET_MODEL,
        titulo: 'New Mission',
        target_system_prompt: '',
        tester_persona: '',
        mission_goal: '',
        variables: {},
        max_turns: 8,
        api_config: {
            post_url: '',
            get_url: '',
            auth_header: '',
            payload_template: '{\n  "message": "{{message}}"\n}',
            response_path: '',
            polling_interval: 2000,
            max_timeout: 30,
        },
    });

    const [variablesJson, setVariablesJson] = useState('{}');
    const [jsonError, setJsonError] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const [unsavedModalOpen, setUnsavedModalOpen] = useState(false);
    const [pendingDestination, setPendingDestination] = useState<string | number | null>(null);
    const savedDataRef = useRef<string>('');

    const projectMissionsUrl = formData.project_id
        ? `/projects/${formData.project_id}?tab=missions`
        : null;

    // Resolve project context
    const currentProject = projects.find((p) => p.id === formData.project_id);
    const availablePrompts = currentProject?.system_prompts || [];
    const canGenerateWithAI = availablePrompts.length > 0;
    const availableEnvs = currentProject?.environments || [];

    // Resolved values from project
    const selectedPrompt = availablePrompts.find((sp) => sp.id === formData.system_prompt_id);
    const selectedEnv = availableEnvs.find((e) => e.id === formData.environment_id);

    const handleAiGenerate = async () => {
        if (!geminiApiKey) {
            addToast('Configure your Gemini API Key in Settings first.', 'error');
            return;
        }
        if (!currentProject) {
            addToast('Project context is missing.', 'error');
            return;
        }
        if (currentProject.system_prompts.length === 0) {
            addToast('Add at least one system prompt to the project before generating missions.', 'error');
            return;
        }
        const validSelectedPromptIds = selectedAiPromptIds.filter((promptId) =>
            currentProject.system_prompts.some((prompt) => prompt.id === promptId)
        );
        if (validSelectedPromptIds.length === 0) {
            addToast('Select at least one system prompt before generating missions.', 'error');
            return;
        }

        setIsGenerating(true);
        setGenError('');

        try {
            const generated = await generateMissionsFromAI(
                geminiApiKey,
                currentProject,
                aiPrompt.trim() || undefined,
                aiCount,
                validSelectedPromptIds
            );

            generated.forEach((m) => addMission(m));
            
            // Redirect to project Missions tab
            navigate(`/projects/${currentProject.id}?tab=missions`);
        } catch (error) {
            setGenError(error instanceof Error ? error.message : 'Failed to generate missions');
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        if (!isNew && id) {
            const existing = missions.find((m) => m.id === id);
            if (existing) {
                const normalizedMission = normalizeMission(existing);
                setFormData(normalizedMission);
                setVariablesJson(JSON.stringify(normalizedMission.variables, null, 2));
                savedDataRef.current = JSON.stringify(normalizedMission);
            } else {
                navigate('/');
            }
        } else if (isNew) {
            // Set defaults from project if available
            const project = projects.find((p) => p.id === projectIdFromQuery);
            const defaultEnvId = project?.environments[0]?.id || '';
            const defaultPromptId = project?.system_prompts[0]?.id || '';
            const defaultEnv = project?.environments.find((e) => e.id === defaultEnvId);
            const defaultPrompt = project?.system_prompts.find((sp) => sp.id === defaultPromptId);

            setFormData((prev) => ({
                ...prev,
                environment_id: defaultEnvId,
                system_prompt_id: defaultPromptId,
                target_system_prompt: defaultPrompt?.content || '',
                target_provider: getMissionTargetProvider(prev),
                target_gemini_model: getMissionGeminiModel(prev),
                api_config: defaultEnv?.api_config || prev.api_config,
                variables: defaultMockMission.variables,
            }));
            setVariablesJson(JSON.stringify(defaultMockMission.variables, null, 2));
            savedDataRef.current = '';
        }
    }, [id, isNew, missions, navigate, projects, projectIdFromQuery]);

    // Track dirty state
    useEffect(() => {
        if (savedDataRef.current) {
            setIsDirty(JSON.stringify(normalizeMission(formData)) !== savedDataRef.current);
        } else if (isNew) {
            setIsDirty(true);
        }
    }, [formData, isNew]);

    // Consolidate change handler to support simultaneous updates and prevent stale synchronization
    const handleFormChange = (updated: Mission) => {
        const finalData = { ...updated };

        // 1. If system_prompt_id changed, sync target_system_prompt
        if (updated.system_prompt_id !== formData.system_prompt_id) {
            const prompt = availablePrompts.find((sp) => sp.id === updated.system_prompt_id);
            finalData.target_system_prompt = prompt?.content || '';
        }

        // 2. If environment_id changed, sync api_config
        if (updated.environment_id !== formData.environment_id) {
            const env = availableEnvs.find((e) => e.id === updated.environment_id);
            finalData.api_config = env?.api_config || updated.api_config;
        }

        setFormData(finalData);
    };

    const handleSave = useCallback(() => {
        if (!formData.titulo || formData.titulo.trim() === '') {
            addToast('Mission Title is required', 'error');
            setActiveTab('goal');
            return;
        }
        if (!formData.mission_goal || formData.mission_goal.trim() === '') {
            addToast('Mission Goal is required', 'error');
            setActiveTab('goal');
            return;
        }
        if (!formData.tester_persona || formData.tester_persona.trim() === '') {
            addToast('Tester Persona is required', 'error');
            setActiveTab('goal');
            return;
        }
        if (jsonError) {
            addToast('Fix JSON errors before saving', 'error');
            return;
        }
        const missionToSave = normalizeMission(formData);
        if (isNew) {
            addMission(missionToSave);
        } else {
            updateMission(formData.id, missionToSave);
        }
        savedDataRef.current = JSON.stringify(missionToSave);
        setIsDirty(false);
        if (projectMissionsUrl) {
            navigate(projectMissionsUrl);
        } else {
            navigate('/');
        }
    }, [jsonError, formData, isNew, addMission, updateMission, projectMissionsUrl, navigate, addToast]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave]);

    const requestNavigate = (destination: string | number) => {
        if (isDirty) {
            setPendingDestination(destination);
            setUnsavedModalOpen(true);
        } else {
            if (typeof destination === 'number') navigate(destination);
            else navigate(destination);
        }
    };

    const doSaveAndLeave = () => {
        if (!formData.titulo || formData.titulo.trim() === '') {
            addToast('Mission Title is required', 'error');
            setActiveTab('goal');
            setUnsavedModalOpen(false);
            return;
        }
        if (!formData.mission_goal || formData.mission_goal.trim() === '') {
            addToast('Mission Goal is required', 'error');
            setActiveTab('goal');
            setUnsavedModalOpen(false);
            return;
        }
        if (!formData.tester_persona || formData.tester_persona.trim() === '') {
            addToast('Tester Persona is required', 'error');
            setActiveTab('goal');
            setUnsavedModalOpen(false);
            return;
        }
        if (jsonError) {
            setUnsavedModalOpen(false);
            addToast('Fix JSON errors before saving', 'error');
            return;
        }
        const missionToSave = normalizeMission(formData);
        if (isNew) addMission(missionToSave);
        else updateMission(formData.id, missionToSave);
        savedDataRef.current = JSON.stringify(missionToSave);
        setIsDirty(false);
        setUnsavedModalOpen(false);
        if (pendingDestination !== null) {
            if (typeof pendingDestination === 'number') navigate(pendingDestination);
            else navigate(pendingDestination);
        }
    };

    const doDiscardAndLeave = () => {
        setUnsavedModalOpen(false);
        if (pendingDestination !== null) {
            if (typeof pendingDestination === 'number') navigate(pendingDestination);
            else navigate(pendingDestination);
        }
    };

    const doCancelModal = () => {
        setUnsavedModalOpen(false);
        setPendingDestination(null);
    };

    const targetProvider = currentProject
        ? getProjectTargetProvider(currentProject, formData)
        : getMissionTargetProvider(formData);
    const targetGeminiModel = currentProject
        ? getProjectGeminiModel(currentProject, formData)
        : getMissionGeminiModel(formData);


    if (isNew && creationMethod === 'select') {
        return (
            <div className="p-8 max-w-4xl mx-auto pb-24 animate-fade-in select-none">
                <div className="flex items-center gap-4 mb-10">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => projectMissionsUrl ? navigate(projectMissionsUrl) : navigate(-1)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Project
                    </Button>
                </div>

                <div className="text-center max-w-xl mx-auto mb-12">
                    <h1 className="text-display text-white mb-3">Create New Mission</h1>
                    <p className="text-body text-slate-400">
                        How would you like to define your new test mission scenario?
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    {/* Option 1: Manual Creation */}
                    <div 
                        onClick={() => setCreationMethod('manual')}
                        className="group border border-border/80 hover:border-[#4A72FF]/50 bg-card/60 p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-[0_10px_30px_rgba(74,114,255,0.08)] flex flex-col items-center text-center space-y-4 hover:-translate-y-1 active:scale-[0.98]"
                    >
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-border/60 group-hover:bg-[#4A72FF]/10 group-hover:border-[#4A72FF]/30 transition-all duration-300">
                            <Compass className="w-8 h-8 text-slate-400 group-hover:text-[#4A72FF] transition-all duration-300" />
                        </div>
                        <div>
                            <h3 className="text-title text-white group-hover:text-[#4A72FF] transition-colors">Create Manually</h3>
                            <p className="text-body text-slate-400 mt-2">
                                Write your own scenario guidelines, variables, environment targets, and custom LLM validation criteria manually.
                            </p>
                        </div>
                    </div>

                    {/* Option 2: AI Generation */}
                    <div 
                        onClick={() => {
                            if (!canGenerateWithAI) {
                                addToast('Add at least one system prompt to the project before generating missions.', 'error');
                                return;
                            }
                            setSelectedAiPromptIds(availablePrompts.map((prompt) => prompt.id));
                            setCreationMethod('ai');
                        }}
                        aria-disabled={!canGenerateWithAI}
                        className={`border border-border/80 bg-card/60 p-6 rounded-2xl transition-all duration-300 flex flex-col items-center text-center space-y-4 ${
                            canGenerateWithAI
                                ? 'group hover:border-[#8B5CF6]/50 cursor-pointer hover:shadow-[0_10px_30px_rgba(139,92,246,0.08)] hover:-translate-y-1 active:scale-[0.98]'
                                : 'opacity-60 cursor-not-allowed'
                        }`}
                    >
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-border/60 group-hover:bg-[#8B5CF6]/10 group-hover:border-[#8B5CF6]/30 transition-all duration-300">
                            <Sparkles className="w-8 h-8 text-slate-400 group-hover:text-[#8B5CF6] transition-all duration-300" />
                        </div>
                        <div>
                            <h3 className="text-title text-white group-hover:text-[#8B5CF6] transition-colors">Generate with AI</h3>
                            <p className="text-body text-slate-400 mt-2">
                                Let Gemini 2.5 Pro analyze your project documentation to automatically generate multiple comprehensive test scenarios.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isNew && creationMethod === 'ai') {
        return (
            <AiMissionGenerator
                onBack={() => setCreationMethod('select')}
                aiPrompt={aiPrompt}
                setAiPrompt={setAiPrompt}
                aiCount={aiCount}
                setAiCount={setAiCount}
                isGenerating={isGenerating}
                genError={genError}
                handleAiGenerate={handleAiGenerate}
                systemPrompts={availablePrompts}
                selectedSystemPromptIds={selectedAiPromptIds}
                setSelectedSystemPromptIds={setSelectedAiPromptIds}
            />
        );
    }

    const missionTabs: { key: MissionTab; label: string; icon: React.ReactNode }[] = [
        { key: 'goal', label: 'Mission Goal', icon: <Target className="w-4 h-4" /> },
        { key: 'integration', label: 'Integration', icon: <Server className="w-4 h-4" /> },
        { key: 'variables', label: 'Variables', icon: <Eye className="w-4 h-4" /> },
        { key: 'criteria', label: 'Approval Criteria', icon: <FileText className="w-4 h-4" /> },
    ];

    return (
        <div className="p-6 md:p-8 w-full max-w-[1600px] mx-auto pb-24">
            {/* Header */}
            <div id="mission-editor-header" className="flex items-center gap-4 mb-6 select-none">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => isNew ? setCreationMethod('select') : requestNavigate(projectMissionsUrl || -1)}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <h1 className="text-display text-white">
                    {isNew ? 'Create Mission' : 'Edit Mission'}
                </h1>
                {isDirty && (
                    <Badge variant="destructive">
                        Unsaved
                    </Badge>
                )}
            </div>

            {/* Header bar wrapping sub-tabs and premium Save button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 select-none">
                {/* Configuration sub-tabs bar */}
                <div className="flex flex-wrap gap-2.5 p-1 bg-[#1C2026] rounded-xl border border-border/50 w-fit">
                    {missionTabs.map((tab) => (
                        <button
                            key={tab.key}
                            id={`mission-tab-${tab.key}`}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-3.5 py-2 text-label transition-all duration-300 rounded-lg cursor-pointer ${
                                activeTab === tab.key
                                    ? 'bg-[#272D35] text-white border border-border/40 shadow-sm scale-[1.02]'
                                    : 'text-muted-foreground hover:text-slate-200'
                            }`}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            {tab.key === 'criteria' && (
                                <span className="ml-1.5 text-label bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full border border-border/30 font-bold tabular-nums">
                                    {(formData.evaluation_criteria || []).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Premium Save Mission Button */}
                <Button
                    id="mission-save-button"
                    onClick={handleSave}
                    className="gap-2 transition-all duration-300 shadow-[0_4px_15px_rgba(74,114,255,0.25)] hover:scale-[1.02] active:scale-[0.98] px-5 py-2.5 rounded-lg cursor-pointer bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] text-white border border-white/[0.05]"
                >
                    <Save className="w-3.5 h-3.5" /> Save Mission
                </Button>
            </div>

            {/* Sub-tab Content Area */}
            <div className="grid grid-cols-1 gap-6">
                {activeTab === 'integration' && (
                    <MissionIntegrationTab
                        formData={formData}
                        onChange={handleFormChange}
                        currentProject={currentProject}
                        availablePrompts={availablePrompts}
                        availableEnvs={availableEnvs}
                        targetProvider={targetProvider}
                        targetGeminiModel={targetGeminiModel}
                        selectedPrompt={selectedPrompt}
                        selectedEnv={selectedEnv}
                        requestNavigate={(path) => requestNavigate(path)}
                    />
                )}

                {activeTab === 'goal' && (
                    <MissionGoalTab
                        formData={formData}
                        onChange={handleFormChange}
                    />
                )}

                {activeTab === 'variables' && (
                    <MissionVariablesTab
                        formData={formData}
                        onChange={handleFormChange}
                        variablesJson={variablesJson}
                        setVariablesJson={setVariablesJson}
                        jsonError={jsonError}
                        setJsonError={setJsonError}
                    />
                )}

                {activeTab === 'criteria' && (
                    <MissionCriteriaTab
                        formData={formData}
                        onChange={handleFormChange}
                    />
                )}
            </div>

            <UnsavedChangesModal
                isOpen={unsavedModalOpen}
                onSave={doSaveAndLeave}
                onDiscard={doDiscardAndLeave}
                onCancel={doCancelModal}
            />
        </div>
    );
};
