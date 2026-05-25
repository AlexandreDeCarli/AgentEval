import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMissionStore, defaultMockMission } from '../store/useMissionStore';
import { useProjectStore } from '../store/useProjectStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { Mission, TargetProvider } from '../types';
import { generateMissionsFromAI } from '../services/missionGenerator';
import { UnsavedChangesModal } from '../components/ui/UnsavedChangesModal';
import { ArrowLeft, Save, Plus, Trash2, ExternalLink, ChevronDown, ChevronUp, Eye, Sparkles, Compass, Server, Target, FileText, HelpCircle } from 'lucide-react';
import {
    DEFAULT_GEMINI_TARGET_MODEL,
    getMissionGeminiModel,
    getMissionTargetProvider,
    getProjectGeminiModel,
    getProjectTargetProvider,
    SUGGESTED_GEMINI_TARGET_MODELS,
} from '../utils/missionTarget';

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
    const [isGenerating, setIsGenerating] = useState(false);
    const [genError, setGenError] = useState('');

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
    const [showPromptPreview, setShowPromptPreview] = useState(false);
    const [showApiPreview, setShowApiPreview] = useState(false);
    const [unsavedModalOpen, setUnsavedModalOpen] = useState(false);
    const [pendingDestination, setPendingDestination] = useState<string | number | null>(null);
    const savedDataRef = useRef<string>('');

    // Resolve project context
    const currentProject = projects.find((p) => p.id === formData.project_id);
    const availablePrompts = currentProject?.system_prompts || [];
    const availableEnvs = currentProject?.environments || [];

    // Resolved values from project
    const selectedPrompt = availablePrompts.find((sp) => sp.id === formData.system_prompt_id);
    const selectedEnv = availableEnvs.find((e) => e.id === formData.environment_id);

    const handleAiGenerate = async () => {
        if (!geminiApiKey) {
            alert('Configure your Gemini API Key in Settings first.');
            return;
        }
        if (!currentProject) {
            alert('Project context is missing.');
            return;
        }
        if (currentProject.system_prompts.length === 0) {
            alert('Add at least one system prompt to the project before generating missions.');
            return;
        }

        setIsGenerating(true);
        setGenError('');

        try {
            const generated = await generateMissionsFromAI(
                geminiApiKey,
                currentProject,
                aiPrompt.trim() || undefined,
                aiCount
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

    // When system_prompt_id changes, sync target_system_prompt
    const handleSystemPromptChange = (promptId: string) => {
        const prompt = availablePrompts.find((sp) => sp.id === promptId);
        setFormData((prev) => ({
            ...prev,
            system_prompt_id: promptId,
            target_system_prompt: prompt?.content || '',
        }));
    };

    // When environment_id changes, sync api_config
    const handleEnvironmentChange = (envId: string) => {
        const env = availableEnvs.find((e) => e.id === envId);
        setFormData((prev) => ({
            ...prev,
            environment_id: envId,
            api_config: env?.api_config || prev.api_config,
        }));
    };

    const handleVarChange = (val: string) => {
        setVariablesJson(val);
        try {
            const parsed = JSON.parse(val);
            setFormData((prev) => ({ ...prev, variables: parsed }));
            setJsonError('');
        } catch {
            setJsonError('Invalid JSON format');
        }
    };

    const handleSave = () => {
        if (jsonError) return alert('Fix JSON errors before saving');
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
    };

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
        if (jsonError) {
            setUnsavedModalOpen(false);
            alert('Fix JSON errors before saving');
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

    const handleAddCriterion = () => {
        setFormData((prev) => ({
            ...prev,
            evaluation_criteria: [
                ...(prev.evaluation_criteria || []),
                { id: `crit-${Date.now()}`, name: '', description: '' },
            ],
        }));
    };

    const handleUpdateCriterion = (index: number, field: string, value: string) => {
        setFormData((prev) => {
            const newCriteria = [...(prev.evaluation_criteria || [])];
            newCriteria[index] = { ...newCriteria[index], [field]: value };
            return { ...prev, evaluation_criteria: newCriteria };
        });
    };

    const handleRemoveCriterion = (index: number) => {
        setFormData((prev) => {
            const newCriteria = [...(prev.evaluation_criteria || [])];
            newCriteria.splice(index, 1);
            return { ...prev, evaluation_criteria: newCriteria };
        });
    };

    const maskAuth = (auth: string) => {
        if (!auth) return '(empty)';
        if (auth.length <= 20) return '••••••••';
        return auth.substring(0, 15) + '••••••••';
    };

    const targetProvider = currentProject
        ? getProjectTargetProvider(currentProject, formData)
        : getMissionTargetProvider(formData);
    const targetGeminiModel = currentProject
        ? getProjectGeminiModel(currentProject, formData)
        : getMissionGeminiModel(formData);
    const projectMissionsUrl = formData.project_id
        ? `/projects/${formData.project_id}?tab=missions`
        : null;

    const handleTargetProviderChange = (value: TargetProvider) => {
        setFormData((prev) => ({
            ...prev,
            target_provider: value,
            target_gemini_model: value === 'gemini'
                ? getMissionGeminiModel(prev)
                : prev.target_gemini_model,
        }));
    };

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
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-3">Create New Mission</h1>
                    <p className="text-sm text-slate-400">
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
                            <h3 className="text-lg font-bold text-white group-hover:text-[#4A72FF] transition-colors">Create Manually</h3>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                                Write your own scenario guidelines, variables, environment targets, and custom LLM validation criteria manually.
                            </p>
                        </div>
                    </div>

                    {/* Option 2: AI Generation */}
                    <div 
                        onClick={() => setCreationMethod('ai')}
                        className="group border border-border/80 hover:border-[#8B5CF6]/50 bg-card/60 p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-[0_10px_30px_rgba(139,92,246,0.08)] flex flex-col items-center text-center space-y-4 hover:-translate-y-1 active:scale-[0.98]"
                    >
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-border/60 group-hover:bg-[#8B5CF6]/10 group-hover:border-[#8B5CF6]/30 transition-all duration-300">
                            <Sparkles className="w-8 h-8 text-slate-400 group-hover:text-[#8B5CF6] transition-all duration-300" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white group-hover:text-[#8B5CF6] transition-colors">Generate with AI</h3>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
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
            <div className="p-8 max-w-2xl mx-auto pb-24 animate-fade-in select-none">
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCreationMethod('select')}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                </div>

                <div className="border border-primary/30 bg-card/60 p-6 rounded-2xl space-y-6">
                    <div className="flex items-start gap-3 border-b border-border/60 pb-4">
                        <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Generate Missions with AI</h2>
                            <p className="text-xs text-muted-foreground mt-1">
                                Gemini 2.5 Pro will read your project documentation and design multiple rich testing missions with objectives, approval criteria, and variables automatically.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                                Directions for the AI <span className="font-normal normal-case">(optional)</span>
                            </label>
                            <textarea
                                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60 h-28"
                                placeholder="Ex: Create payment scenarios, the persona should be someone chatting on WhatsApp with direct messages and abbreviations. Focus on PIX key error cases."
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                disabled={isGenerating}
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={aiCount}
                                    onChange={(e) => setAiCount(Math.max(1, Math.min(20, Number(e.target.value))))}
                                    className="w-16 bg-input border border-border rounded-md px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    disabled={isGenerating}
                                />
                            </div>
                            <Button
                                onClick={handleAiGenerate}
                                disabled={isGenerating}
                                className="gap-2 ml-auto bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] text-white shadow-[0_4px_15px_rgba(74,114,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer font-bold"
                            >
                                {isGenerating ? (
                                    <>
                                        <Spinner className="w-4 h-4 animate-spin" /> Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" /> Generate
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {genError && (
                        <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                            {genError}
                        </p>
                    )}
                </div>
            </div>
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
                <h1 className="text-3xl font-bold tracking-tight">
                    {isNew ? 'Create Mission' : 'Edit Mission'}
                </h1>
                {isDirty && (
                    <Badge variant="destructive" className="text-[10px]">
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
                            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-lg cursor-pointer ${
                                activeTab === tab.key
                                    ? 'bg-[#272D35] text-white border border-border/40 shadow-sm scale-[1.02]'
                                    : 'text-muted-foreground hover:text-slate-200'
                            }`}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            {tab.key === 'criteria' && (
                                <span className="ml-1.5 text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full border border-border/30">
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
                    className="gap-2 transition-all duration-300 shadow-[0_4px_15px_rgba(74,114,255,0.25)] hover:scale-[1.02] active:scale-[0.98] font-bold text-xs uppercase tracking-wide px-5 py-2.5 rounded-lg cursor-pointer bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] text-white border border-white/[0.05]"
                >
                    <Save className="w-3.5 h-3.5" /> Save Mission
                </Button>
            </div>

            {/* Sub-tab Content Area */}
            <div className="grid grid-cols-1 gap-6">
                {/* Sub-tab: Integration */}
                {activeTab === 'integration' && (
                    <div className="grid grid-cols-1 gap-6">
                        {/* System Prompt Selection */}
                        {currentProject && (
                            <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card shadow-sm">
                                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                                    <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                        <span>Target System Prompt</span>
                                        <span title="Select which system prompt persona will be applied to the target agent for this specific mission.">
                                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                        </span>
                                    </h2>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-2 text-xs text-muted-foreground hover:text-foreground h-8"
                                        onClick={() =>
                                            requestNavigate(`/projects/${currentProject.id}`)
                                        }
                                    >
                                        <ExternalLink className="w-3 h-3" /> Edit in Project
                                    </Button>
                                </div>

                                <select
                                    className="w-full h-10 rounded-md border border-input bg-[#1C2026] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={formData.system_prompt_id || ''}
                                    onChange={(e) => handleSystemPromptChange(e.target.value)}
                                >
                                    <option value="">-- Select a system prompt --</option>
                                    {availablePrompts.map((sp) => (
                                        <option key={sp.id} value={sp.id}>
                                            {sp.name}
                                        </option>
                                    ))}
                                </select>

                                {selectedPrompt && (
                                    <div>
                                        <button
                                            onClick={() => setShowPromptPreview(!showPromptPreview)}
                                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            {showPromptPreview ? 'Hide' : 'Preview'} prompt content
                                            {showPromptPreview ? (
                                                <ChevronUp className="w-3.5 h-3.5" />
                                            ) : (
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                        {showPromptPreview && (
                                            <div className="mt-3 p-4 bg-muted rounded-lg border border-border max-h-64 overflow-y-auto">
                                                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                                                    {selectedPrompt.content}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!selectedPrompt && formData.system_prompt_id === '' && (
                                    <p className="text-xs text-muted-foreground">
                                        Select a system prompt from the project. The evaluator uses it to
                                        grade the agent's behavior.
                                    </p>
                                )}
                            </section>
                        )}

                        {/* Target Integration */}
                        <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card shadow-sm">
                            <div className="flex items-center justify-between border-b border-border/40 pb-2">
                                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                                    {currentProject ? 'Project Target Integration' : 'Target Integration'}
                                </h2>
                                {currentProject && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-2 text-xs text-muted-foreground hover:text-foreground h-8"
                                        onClick={() =>
                                            requestNavigate(`/projects/${currentProject.id}`)
                                        }
                                    >
                                        <ExternalLink className="w-3 h-3" /> Edit in Project
                                    </Button>
                                )}
                            </div>

                            {currentProject ? (
                                targetProvider === 'gemini' ? (
                                    <div className="space-y-3">
                                        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                                            <p className="text-sm font-medium">Gemini project target</p>
                                            <p className="text-xs text-muted-foreground">
                                                This mission will run directly against Gemini using the
                                                project configuration.
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Model: <span className="font-mono">{targetGeminiModel}</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                AgentEval reuses the Gemini API key configured in Settings
                                                for the target call.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                                            <p className="text-sm font-medium">HTTP project target</p>
                                            <p className="text-xs text-muted-foreground">
                                                The provider is configured at the project level. This mission
                                                only selects which environment should be used.
                                            </p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                                <span>Active Environment</span>
                                                <span title="Select which API environment (e.g. Staging, Production) the test agent will send HTTP requests to.">
                                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                                </span>
                                            </label>
                                            <select
                                                className="w-full h-10 rounded-md border border-input bg-[#1C2026] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                value={formData.environment_id || ''}
                                                onChange={(e) => handleEnvironmentChange(e.target.value)}
                                            >
                                                <option value="">-- Select an environment --</option>
                                                {availableEnvs.map((env) => (
                                                    <option key={env.id} value={env.id}>
                                                        {env.name}
                                                     </option>
                                                ))}
                                            </select>
                                        </div>

                                        {selectedEnv && (
                                            <div>
                                                <button
                                                    onClick={() => setShowApiPreview(!showApiPreview)}
                                                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    {showApiPreview ? 'Hide' : 'Preview'} API configuration
                                                    {showApiPreview ? (
                                                        <ChevronUp className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                                {showApiPreview && (
                                                    <div className="mt-3 p-4 bg-muted rounded-lg border border-border space-y-3">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                                                    POST URL
                                                                </span>
                                                                <p className="text-xs font-mono mt-0.5 break-all">
                                                                    {selectedEnv.api_config.post_url || '(empty)'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                                                    GET URL
                                                                </span>
                                                                <p className="text-xs font-mono mt-0.5 break-all">
                                                                    {selectedEnv.api_config.get_url || '(empty)'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                                                Auth Header
                                                            </span>
                                                            <p className="text-xs font-mono mt-0.5">
                                                                {maskAuth(selectedEnv.api_config.auth_header)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                                                Payload Template
                                                            </span>
                                                            <pre className="text-xs font-mono mt-0.5 bg-background p-2 rounded border border-border whitespace-pre-wrap max-h-32 overflow-y-auto">
                                                                {selectedEnv.api_config.payload_template}
                                                            </pre>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div>
                                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                                                    Response Path
                                                                </span>
                                                                <p className="text-xs font-mono mt-0.5">
                                                                    {selectedEnv.api_config.response_path || '(auto)'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                                                    Polling
                                                                </span>
                                                                <p className="text-xs font-mono mt-0.5">
                                                                    {selectedEnv.api_config.polling_interval}ms
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                                                    Timeout
                                                                </span>
                                                                <p className="text-xs font-mono mt-0.5">
                                                                    {selectedEnv.api_config.max_timeout}s
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {!selectedEnv && formData.environment_id === '' && (
                                            <p className="text-xs text-muted-foreground">
                                                Select an environment to define where the test agent will
                                                send messages.
                                            </p>
                                        )}
                                    </>
                                )
                            ) : targetProvider === 'gemini' ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-300 mb-1 block">
                                            Target Provider
                                        </label>
                                        <select
                                            className="w-full h-10 rounded-md border border-input bg-[#1C2026] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            value={targetProvider}
                                            onChange={(e) =>
                                                handleTargetProviderChange(e.target.value as TargetProvider)
                                            }
                                        >
                                            <option value="http">HTTP API</option>
                                            <option value="gemini">Gemini</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-300 mb-1 block">
                                            Gemini Model
                                        </label>
                                        <Input
                                            list="gemini-model-suggestions"
                                            value={targetGeminiModel}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    target_gemini_model: e.target.value,
                                                }))
                                            }
                                            placeholder={DEFAULT_GEMINI_TARGET_MODEL}
                                            className="font-mono"
                                        />
                                        <datalist id="gemini-model-suggestions">
                                            {SUGGESTED_GEMINI_TARGET_MODELS.map((model) => (
                                                <option key={model} value={model} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                                        <p className="text-sm font-medium">Standalone Gemini target mode</p>
                                        <p className="text-xs text-muted-foreground">
                                            AgentEval will reuse the same Gemini API key configured in
                                            Settings for the target call.
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            The selected target system prompt will be sent as the Gemini
                                            system instruction for the model under test.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-300 mb-1 block">
                                            Target Provider
                                        </label>
                                        <select
                                            className="w-full h-10 rounded-md border border-input bg-[#1C2026] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            value={targetProvider}
                                            onChange={(e) =>
                                                handleTargetProviderChange(e.target.value as TargetProvider)
                                            }
                                        >
                                            <option value="http">HTTP API</option>
                                            <option value="gemini">Gemini</option>
                                        </select>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Link this mission to a project environment if you want to run it
                                        against an HTTP target.
                                    </p>
                                </>
                            )}
                        </section>
                    </div>
                )}

                {/* Sub-tab: Goal */}
                {activeTab === 'goal' && (
                    <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card shadow-sm">
                        <h2 className="text-base font-bold text-white uppercase tracking-wider border-b border-border/40 pb-2">
                            Mission Goal Config
                        </h2>
                        <div>
                            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                <span>Mission Title</span>
                                <span title="Give your mission a short and descriptive title (e.g., 'Discount Negotiation' or 'Secret Leak Test').">
                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                </span>
                            </label>
                            <Input
                                value={formData.titulo}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, titulo: e.target.value }))
                                }
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                <span>Mission Goal</span>
                                <span className="text-muted-foreground font-normal">
                                    (Use {'{{var}}'} for variables)
                                </span>
                                <span title="Define what the evaluator should try to achieve when talking to the agent under test. You can inject variables dynamically.">
                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                </span>
                            </label>
                            <textarea
                                className="w-full h-24 rounded-md border border-input bg-[#13161B] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring leading-relaxed"
                                value={formData.mission_goal}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        mission_goal: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                <span>Tester Persona (Instructions for Test Agent)</span>
                                <span title="Define the role, tone, personality, or behavioral guidelines for the Intelligent Evaluator (e.g., 'Act as an angry, impatient customer').">
                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                </span>
                            </label>
                            <textarea
                                className="w-full h-28 rounded-md border border-input bg-[#13161B] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring leading-relaxed"
                                value={formData.tester_persona}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        tester_persona: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                <span>Max Turns (Conversation length limit)</span>
                                <span title="The maximum number of message rounds allowed before ending the conversation and making the evaluation.">
                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                </span>
                            </label>
                            <Input
                                type="number"
                                value={formData.max_turns}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        max_turns: parseInt(e.target.value) || 8,
                                    }))
                                }
                            />
                        </div>
                    </section>
                )}

                {/* Sub-tab: Variables */}
                {activeTab === 'variables' && (
                    <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card shadow-sm">
                        <h2 className="text-base font-bold text-white uppercase tracking-wider border-b border-border/40 pb-2 flex items-center gap-1.5">
                            <span>Scenario Variables (JSON)</span>
                            <span title="Input a JSON object/map with array values (e.g. { 'username': ['Alex', 'Bob'], 'product': ['Premium'] }). The system will run tests for all possible combinations.">
                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                            </span>
                        </h2>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Define lists of inputs inside a JSON map. A separate test run will be triggered dynamically for each possible variable configuration.
                        </p>
                        <div>
                            <textarea
                                className={`w-full h-64 font-mono rounded-md border bg-[#13161B] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring leading-relaxed ${jsonError ? 'border-destructive' : 'border-input'}`}
                                value={variablesJson}
                                onChange={(e) => handleVarChange(e.target.value)}
                            />
                            {jsonError && (
                                <span className="text-destructive text-xs mt-1 block">
                                    {jsonError}
                                </span>
                            )}
                        </div>
                    </section>
                )}

                {/* Sub-tab: Criteria */}
                {activeTab === 'criteria' && (
                    <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card shadow-sm">
                        <div className="flex items-center justify-between border-b border-border/40 pb-2">
                            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                <span>Evaluation Criteria</span>
                                <span title="Define the list of checks or rules that Gemini will evaluate at the end of the chat. The score (0-100) will be calculated based on passing these criteria.">
                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                </span>
                            </h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAddCriterion}
                                className="h-8 gap-2 font-bold text-xs uppercase"
                            >
                                <Plus className="w-3 h-3" /> Add Criterion
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            The Evaluator LLM will grade the interaction against these specific rules.
                        </p>
                        <div className="space-y-4">
                            {(formData.evaluation_criteria || []).map((crit, idx) => (
                                <div
                                    key={crit.id}
                                    className="flex gap-4 items-start bg-muted/40 p-4 rounded-lg border border-border/40"
                                >
                                    <div className="flex-1 space-y-3">
                                        <Input
                                            placeholder="Criterion Name (e.g., Tone, Accuracy)"
                                            value={crit.name}
                                            onChange={(e) =>
                                                handleUpdateCriterion(idx, 'name', e.target.value)
                                            }
                                            className="bg-[#13161B] h-8 font-semibold"
                                        />
                                        <textarea
                                            placeholder="Description: How should the AI evaluate this?"
                                            className="w-full h-16 rounded-md border border-input bg-[#13161B] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            value={crit.description}
                                            onChange={(e) =>
                                                handleUpdateCriterion(
                                                    idx,
                                                    'description',
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveCriterion(idx)}
                                        className="text-destructive hover:bg-destructive/10 mt-1 h-8 w-8 p-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {(!formData.evaluation_criteria ||
                                formData.evaluation_criteria.length === 0) && (
                                <div className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-lg border-border/50">
                                    No custom criteria defined. The evaluator will use its default judgment.
                                </div>
                            )}
                        </div>
                    </section>
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
