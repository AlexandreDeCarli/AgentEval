import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMissionStore, defaultMockMission } from '../store/useMissionStore';
import { useProjectStore } from '../store/useProjectStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Mission, TargetProvider } from '../types';
import { UnsavedChangesModal } from '../components/ui/UnsavedChangesModal';
import { ArrowLeft, Save, Plus, Trash2, ExternalLink, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import {
    DEFAULT_GEMINI_TARGET_MODEL,
    getMissionGeminiModel,
    getMissionTargetProvider,
    getProjectGeminiModel,
    getProjectTargetProvider,
    SUGGESTED_GEMINI_TARGET_MODELS,
} from '../utils/missionTarget';

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

    return (
        <div className="p-8 max-w-4xl mx-auto pb-24">
            <div className="flex items-center gap-4 mb-8">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => requestNavigate(projectMissionsUrl || -1)}
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
                <div className="ml-auto">
                    <Button onClick={handleSave} className="gap-2">
                        <Save className="w-4 h-4" /> Save Mission
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* System Prompt Selection */}
                {currentProject && (
                    <section className="space-y-4 border border-border p-6 rounded-xl bg-card">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Target System Prompt</h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() =>
                                    requestNavigate(`/projects/${currentProject.id}`)
                                }
                            >
                                <ExternalLink className="w-3 h-3" /> Edit in Project
                            </Button>
                        </div>

                        <select
                            className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
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

                <section className="space-y-4 border border-border p-6 rounded-xl bg-card">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">
                            {currentProject ? 'Project Target Integration' : 'Target Integration'}
                        </h2>
                        {currentProject && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2 text-xs text-muted-foreground hover:text-foreground"
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
                                <select
                                    className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

                                {selectedEnv && (
                                    <div>
                                        <button
                                            onClick={() => setShowApiPreview(!showApiPreview)}
                                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
                                <label className="text-sm font-medium mb-1 block">
                                    Target Provider
                                </label>
                                <select
                                    className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                                <label className="text-sm font-medium mb-1 block">
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
                                <label className="text-sm font-medium mb-1 block">
                                    Target Provider
                                </label>
                                <select
                                    className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

                {/* General Info */}
                <section className="space-y-4 border border-border p-6 rounded-xl bg-card">
                    <h2 className="text-xl font-semibold border-b border-border pb-2">
                        General Info
                    </h2>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Mission Title</label>
                        <Input
                            value={formData.titulo}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, titulo: e.target.value }))
                            }
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">
                            Mission Goal{' '}
                            <span className="text-muted-foreground font-normal">
                                (Use {'{{var}}'} for variables)
                            </span>
                        </label>
                        <textarea
                            className="w-full h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                        <label className="text-sm font-medium mb-1 block">
                            Tester Persona (Instructions for Test Agent)
                        </label>
                        <textarea
                            className="w-full h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                        <label className="text-sm font-medium mb-1 block">Variables (JSON)</label>
                        <textarea
                            className={`w-full h-32 font-mono rounded-md border bg-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${jsonError ? 'border-destructive' : 'border-input'}`}
                            value={variablesJson}
                            onChange={(e) => handleVarChange(e.target.value)}
                        />
                        {jsonError && (
                            <span className="text-destructive text-xs mt-1 block">
                                {jsonError}
                            </span>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">
                            Max Turns (Conversation length limit)
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

                {/* Evaluation Criteria */}
                <section className="space-y-4 border border-border p-6 rounded-xl bg-card">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                        <h2 className="text-xl font-semibold">Evaluation Criteria</h2>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddCriterion}
                            className="h-8 gap-2"
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
                                className="flex gap-4 items-start bg-muted p-4 rounded-lg border border-border"
                            >
                                <div className="flex-1 space-y-3">
                                    <Input
                                        placeholder="Criterion Name (e.g., Tone, Accuracy)"
                                        value={crit.name}
                                        onChange={(e) =>
                                            handleUpdateCriterion(idx, 'name', e.target.value)
                                        }
                                        className="bg-background h-8 font-semibold"
                                    />
                                    <textarea
                                        placeholder="Description: How should the AI evaluate this?"
                                        className="w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                            <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg border-border">
                                No custom criteria defined. The evaluator will use its default
                                judgment.
                            </div>
                        )}
                    </div>
                </section>
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
