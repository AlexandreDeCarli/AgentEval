import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useProjectStore } from '../store/useProjectStore';
import { useMissionStore } from '../store/useMissionStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTestExecutionStore } from '../store/useTestExecutionStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { Project, SystemPrompt, Environment, ApiConfig, TargetProvider, Mission } from '../types';
import { generateMissionsFromAI } from '../services/missionGenerator';
import {
    DEFAULT_GEMINI_TARGET_MODEL,
    getProjectGeminiModel,
    getProjectTargetProvider,
    normalizeProjectTargetConfig,
    SUGGESTED_GEMINI_TARGET_MODELS,
} from '../utils/missionTarget';
import {
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    FileText,
    Server,
    Target,
    Sparkles,
    ChevronDown,
    ChevronUp,
    Pencil,
    Check,
    AlertCircle,
    Info,
    Play,
} from 'lucide-react';

type Tab = 'info' | 'docs' | 'prompts' | 'environments' | 'missions';

const defaultApiConfig: ApiConfig = {
    post_url: '',
    get_url: '',
    auth_header: '',
    payload_template: '{\n  "message": "{{message}}"\n}',
    response_path: '',
    polling_interval: 2000,
    max_timeout: 30,
};

export const ProjectEditor: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { projects, updateProject } = useProjectStore();
    const { missions, addMission, deleteMission } = useMissionStore();
    const { geminiApiKey } = useSettingsStore();
    const { startExecution } = useTestExecutionStore();

    const [project, setProject] = useState<Project | null>(null);
    const [missionToDelete, setMissionToDelete] = useState<Mission | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('info');
    const [isGenerating, setIsGenerating] = useState(false);
    const [genError, setGenError] = useState('');
    const [genPrompt, setGenPrompt] = useState('');
    const [genCount, setGenCount] = useState(8);
    const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
    const [expandedEnv, setExpandedEnv] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
    const tabFromQuery = searchParams.get('tab');

    useEffect(() => {
        const found = projects.find((p) => p.id === id);
        if (found) {
            setProject(normalizeProjectTargetConfig({
                ...found,
                documentation: found.documentation || '',
                description: found.description || '',
                system_prompts: found.system_prompts || [],
                environments: found.environments || [],
            }));
        } else {
            navigate('/projects');
        }
    }, [id, projects, navigate]);

    useEffect(() => {
        if (
            tabFromQuery === 'info' ||
            tabFromQuery === 'docs' ||
            tabFromQuery === 'prompts' ||
            tabFromQuery === 'environments' ||
            tabFromQuery === 'missions'
        ) {
            setActiveTab(tabFromQuery);
            return;
        }

        setActiveTab('info');
    }, [tabFromQuery]);

    if (!project) return null;

    const projectMissions = missions.filter((m) => m.project_id === project.id);
    const targetProvider = getProjectTargetProvider(project);
    const targetGeminiModel = getProjectGeminiModel(project);

    const handleRunAllMissions = () => {
        if (!geminiApiKey) {
            alert('Configure your Gemini API Key in Settings first.');
            return;
        }
        projectMissions.forEach((mission) => {
            startExecution(mission, geminiApiKey);
        });
    };

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);

        const nextSearchParams = new URLSearchParams(searchParams);
        if (tab === 'info') {
            nextSearchParams.delete('tab');
        } else {
            nextSearchParams.set('tab', tab);
        }

        setSearchParams(nextSearchParams, { replace: true });
    };

    const handleSave = () => {
        try {
            updateProject(project.id, project);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        } catch {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    // --- System Prompts ---
    const handleAddPrompt = () => {
        const newPrompt: SystemPrompt = {
            id: crypto.randomUUID(),
            name: 'New Prompt',
            content: '',
        };
        setProject({ ...project, system_prompts: [...project.system_prompts, newPrompt] });
        setExpandedPrompt(newPrompt.id);
    };

    const handleUpdatePrompt = (promptId: string, field: keyof SystemPrompt, value: string) => {
        setProject({
            ...project,
            system_prompts: project.system_prompts.map((sp) =>
                sp.id === promptId ? { ...sp, [field]: value } : sp
            ),
        });
    };

    const handleDeletePrompt = (promptId: string) => {
        setProject({
            ...project,
            system_prompts: project.system_prompts.filter((sp) => sp.id !== promptId),
        });
    };

    // --- Environments ---
    const handleAddEnvironment = () => {
        const newEnv: Environment = {
            id: crypto.randomUUID(),
            name: 'New Environment',
            api_config: { ...defaultApiConfig },
        };
        setProject({ ...project, environments: [...project.environments, newEnv] });
        setExpandedEnv(newEnv.id);
    };

    const handleUpdateEnv = (
        envId: string,
        field: 'name',
        value: Environment['name']
    ) => {
        setProject({
            ...project,
            environments: project.environments.map((e) =>
                e.id === envId ? { ...e, [field]: value } : e
            ),
        });
    };

    const handleUpdateEnvApiConfig = (
        envId: string,
        field: keyof ApiConfig,
        value: ApiConfig[keyof ApiConfig]
    ) => {
        setProject({
            ...project,
            environments: project.environments.map((e) =>
                e.id === envId
                    ? { ...e, api_config: { ...e.api_config, [field]: value } }
                    : e
            ),
        });
    };

    const handleDeleteEnv = (envId: string) => {
        setProject({
            ...project,
            environments: project.environments.filter((e) => e.id !== envId),
        });
    };

    const handleTargetProviderChange = (value: TargetProvider) => {
        setProject((prev) =>
            prev
                ? {
                      ...prev,
                      target_provider: value,
                      target_gemini_model:
                          value === 'gemini'
                              ? getProjectGeminiModel(prev)
                              : prev.target_gemini_model,
                  }
                : prev
        );
    };

    // --- AI Mission Generation ---
    const handleGenerateMissions = async () => {
        if (!geminiApiKey) {
            alert('Configure your Gemini API Key in Settings first.');
            return;
        }
        if (project.system_prompts.length === 0) {
            alert('Add at least one system prompt before generating missions.');
            return;
        }

        // Save project first
        updateProject(project.id, project);

        setIsGenerating(true);
        setGenError('');

        try {
            const generated = await generateMissionsFromAI(
                geminiApiKey,
                project,
                genPrompt.trim() || undefined,
                genCount
            );

            generated.forEach((m) => addMission(m));
            handleTabChange('missions');
        } catch (error) {
            setGenError(error instanceof Error ? error.message : 'Failed to generate missions');
        } finally {
            setIsGenerating(false);
        }
    };

    const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
        { key: 'info', label: 'Basic Info', icon: <Info className="w-4 h-4" /> },
        { key: 'docs', label: 'Documentation', icon: <FileText className="w-4 h-4" /> },
        {
            key: 'prompts',
            label: 'System Prompts',
            icon: <FileText className="w-4 h-4" />,
            count: project.system_prompts.length,
        },
        ...(targetProvider !== 'gemini' ? [{
            key: 'environments' as Tab,
            label: 'Environments',
            icon: <Server className="w-4 h-4" />,
            count: project.environments.length,
        }] : []),
        {
            key: 'missions',
            label: 'Missions',
            icon: <Target className="w-4 h-4" />,
            count: projectMissions.length,
        },
    ];

    return (
        <div className="p-6 md:p-8 w-full max-w-[1600px] mx-auto pb-24">
            {/* Header */}
            <div id="project-editor-header" className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <h1 className="text-3xl font-bold tracking-tight truncate flex-1">
                    {project.name || 'Untitled Project'}
                </h1>
                <Button
                    onClick={handleSave}
                    className={`gap-2 transition-colors ${
                        saveStatus === 'saved'
                            ? 'bg-green-600 hover:bg-green-600'
                            : saveStatus === 'error'
                            ? 'bg-destructive hover:bg-destructive'
                            : ''
                    }`}
                >
                    {saveStatus === 'saved' ? (
                        <><Check className="w-4 h-4" /> Saved!</>
                    ) : saveStatus === 'error' ? (
                        <><AlertCircle className="w-4 h-4" /> Error</>
                    ) : (
                        <><Save className="w-4 h-4" /> Save</>
                    )}
                </Button>
            </div>

            {/* Tabs com pílulas premium de gradiente roxo/azul */}
            <div className="flex flex-wrap gap-2.5 mb-8 p-1.5 bg-[#1C2026] rounded-xl border border-border/50 select-none">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        id={`project-tab-${tab.key}`}
                        onClick={() => handleTabChange(tab.key)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 text-xs uppercase tracking-wider font-bold transition-all duration-300 rounded-lg cursor-pointer ${
                            activeTab === tab.key
                                ? 'bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] text-white shadow-[0_4px_15px_rgba(74,114,255,0.3)] border border-white/[0.1] scale-[1.02]'
                                : 'border border-transparent text-muted-foreground hover:text-foreground hover:bg-[#272D35]/60 hover:scale-[1.01]'
                        }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                            <span className={`ml-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                activeTab === tab.key
                                    ? 'bg-white/20 text-white'
                                    : 'bg-[#272D35] text-muted-foreground border border-border/40'
                            }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab: Basic Info (Lado a Lado para melhor aproveitamento horizontal) */}
            {activeTab === 'info' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    {/* Project Info Card */}
                    <section className="space-y-4 border border-border p-6 rounded-xl bg-card flex flex-col justify-between">
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold border-b border-border pb-2">Project Info</h2>
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Name</label>
                                <Input
                                    value={project.name}
                                    onChange={(e) => setProject({ ...project, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Description</label>
                                <textarea
                                    className="w-full h-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={project.description}
                                    onChange={(e) =>
                                        setProject({ ...project, description: e.target.value })
                                    }
                                />
                            </div>
                        </div>
                    </section>

                    {/* Target Integration Card */}
                    <section className="space-y-4 border border-border p-6 rounded-xl bg-card flex flex-col justify-between">
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold border-b border-border pb-2">
                                Target Integration
                            </h2>

                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    Project Target Provider
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
                                <p className="text-xs text-muted-foreground mt-2">
                                    This setting applies to all missions in the project. Missions only
                                    choose which prompt to test and, for HTTP projects, which
                                    environment to use.
                                </p>
                            </div>

                            {targetProvider === 'gemini' ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium mb-1 block">
                                            Gemini Model
                                        </label>
                                        <Input
                                            list="project-gemini-model-suggestions"
                                            value={targetGeminiModel}
                                            onChange={(e) =>
                                                setProject({
                                                    ...project,
                                                    target_gemini_model: e.target.value,
                                                })
                                            }
                                            placeholder={DEFAULT_GEMINI_TARGET_MODEL}
                                            className="font-mono"
                                        />
                                        <datalist id="project-gemini-model-suggestions">
                                            {SUGGESTED_GEMINI_TARGET_MODELS.map((model) => (
                                                <option key={model} value={model} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                                        <p className="text-sm font-medium">Gemini project mode</p>
                                        <p className="text-xs text-muted-foreground">
                                            AgentEval will reuse the Gemini API key configured in
                                            Settings for the target call.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                                    <p className="text-sm font-medium">HTTP project mode</p>
                                    <p className="text-xs text-muted-foreground">
                                        Missions in this project will run against one of the
                                        environments configured in the Environments tab.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {/* Tab: Documentation (Markdown em tela cheia na aba dedicada) */}
            {activeTab === 'docs' && (
                <section className="space-y-4 border border-border p-6 rounded-xl bg-card">
                    <div className="flex justify-between items-center border-b border-border pb-2 mb-2">
                        <h2 className="text-xl font-semibold">
                            Project Documentation (Markdown)
                        </h2>
                        <span className="text-xs text-muted-foreground bg-[#272D35] px-2.5 py-1 rounded border border-border font-mono">
                            {project.documentation?.length || 0} chars
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Paste the full documentation of the target system here. The AI will use
                        it to generate intelligent test missions.
                    </p>
                    <textarea
                        className="w-full h-[62vh] font-mono rounded-lg border border-[#2D3036] bg-input px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A72FF] leading-relaxed"
                        value={project.documentation}
                        onChange={(e) =>
                            setProject({ ...project, documentation: e.target.value })
                        }
                        placeholder="# System Documentation&#10;&#10;Paste the complete documentation of the target system here..."
                    />
                </section>
            )}

            {/* Tab: System Prompts */}
            {activeTab === 'prompts' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                            Add the system prompts used by the target's AI agents.
                        </p>
                        <Button variant="outline" size="sm" onClick={handleAddPrompt} className="gap-2">
                            <Plus className="w-4 h-4" /> Add Prompt
                        </Button>
                    </div>

                    {project.system_prompts.map((sp) => (
                        <div
                            key={sp.id}
                            className="border border-border rounded-xl bg-card overflow-hidden"
                        >
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() =>
                                    setExpandedPrompt(expandedPrompt === sp.id ? null : sp.id)
                                }
                            >
                                <div className="flex items-center gap-3">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">{sp.name || 'Untitled'}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {sp.content.length} chars
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeletePrompt(sp.id);
                                        }}
                                        className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                    {expandedPrompt === sp.id ? (
                                        <ChevronUp className="w-4 h-4" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4" />
                                    )}
                                </div>
                            </div>
                            {expandedPrompt === sp.id && (
                                <div className="p-4 border-t border-border space-y-3">
                                    <Input
                                        placeholder="Prompt Name (e.g., Generic Agent, Payments Agent)"
                                        value={sp.name}
                                        onChange={(e) =>
                                            handleUpdatePrompt(sp.id, 'name', e.target.value)
                                        }
                                    />
                                    <textarea
                                        className="w-full h-64 font-mono rounded-md border border-input bg-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        placeholder="Paste the system prompt content here..."
                                        value={sp.content}
                                        onChange={(e) =>
                                            handleUpdatePrompt(sp.id, 'content', e.target.value)
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    ))}

                    {project.system_prompts.length === 0 && (
                        <div className="py-12 text-center border-2 border-dashed border-border rounded-xl">
                            <p className="text-muted-foreground mb-4">
                                No system prompts added yet.
                            </p>
                            <Button onClick={handleAddPrompt} variant="outline" className="gap-2">
                                <Plus className="w-4 h-4" /> Add first prompt
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Environments */}
            {activeTab === 'environments' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                            Configure API endpoints for each environment (dev, staging, prod).
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddEnvironment}
                            className="gap-2"
                        >
                            <Plus className="w-4 h-4" /> Add Environment
                        </Button>
                    </div>

                    {project.environments.map((env) => (
                        <div
                            key={env.id}
                            className="border border-border rounded-xl bg-card overflow-hidden"
                        >
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() =>
                                    setExpandedEnv(expandedEnv === env.id ? null : env.id)
                                }
                            >
                                <div className="flex items-center gap-3">
                                    <Server className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">
                                        {env.name || 'Untitled'}
                                    </span>
                                    {env.api_config.post_url && (
                                        <span className="text-xs text-muted-foreground truncate max-w-xs">
                                            {env.api_config.post_url}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteEnv(env.id);
                                        }}
                                        className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                    {expandedEnv === env.id ? (
                                        <ChevronUp className="w-4 h-4" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4" />
                                    )}
                                </div>
                            </div>
                            {expandedEnv === env.id && (
                                <div className="p-4 border-t border-border space-y-4">
                                    <Input
                                        placeholder="Environment Name (e.g., Production, Staging)"
                                        value={env.name}
                                        onChange={(e) =>
                                            handleUpdateEnv(env.id, 'name', e.target.value)
                                        }
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">
                                                POST URL
                                            </label>
                                            <Input
                                                placeholder="https://api.example.com/chat"
                                                value={env.api_config.post_url}
                                                onChange={(e) =>
                                                    handleUpdateEnvApiConfig(
                                                        env.id,
                                                        'post_url',
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">
                                                GET URL
                                            </label>
                                            <Input
                                                placeholder="https://api.example.com/messages"
                                                value={env.api_config.get_url}
                                                onChange={(e) =>
                                                    handleUpdateEnvApiConfig(
                                                        env.id,
                                                        'get_url',
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1 block">
                                            Authorization Header
                                        </label>
                                        <Input
                                            placeholder="Bearer token..."
                                            value={env.api_config.auth_header}
                                            onChange={(e) =>
                                                handleUpdateEnvApiConfig(
                                                    env.id,
                                                    'auth_header',
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1 block">
                                            Payload Template (JSON)
                                        </label>
                                        <textarea
                                            className="w-full h-24 font-mono bg-muted rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            value={env.api_config.payload_template}
                                            onChange={(e) =>
                                                handleUpdateEnvApiConfig(
                                                    env.id,
                                                    'payload_template',
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1 block">
                                            Response Data Path
                                        </label>
                                        <Input
                                            placeholder="data.messages[-1].content"
                                            value={env.api_config.response_path}
                                            onChange={(e) =>
                                                handleUpdateEnvApiConfig(
                                                    env.id,
                                                    'response_path',
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">
                                                Polling Interval (ms)
                                            </label>
                                            <Input
                                                type="number"
                                                value={env.api_config.polling_interval}
                                                onChange={(e) =>
                                                    handleUpdateEnvApiConfig(
                                                        env.id,
                                                        'polling_interval',
                                                        parseInt(e.target.value) || 2000
                                                    )
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">
                                                Max Timeout (s)
                                            </label>
                                            <Input
                                                type="number"
                                                value={env.api_config.max_timeout}
                                                onChange={(e) =>
                                                    handleUpdateEnvApiConfig(
                                                        env.id,
                                                        'max_timeout',
                                                        parseInt(e.target.value) || 30
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {project.environments.length === 0 && (
                        <div className="py-12 text-center border-2 border-dashed border-border rounded-xl">
                            <p className="text-muted-foreground mb-4">
                                No environments configured yet.
                            </p>
                            <Button onClick={handleAddEnvironment} variant="outline" className="gap-2">
                                <Plus className="w-4 h-4" /> Add first environment
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Missions */}
            {activeTab === 'missions' && (
                <div className="space-y-6">
                    {/* AI Generation */}
                    <section id="project-mission-generator" className="border border-primary/30 bg-primary/5 p-6 rounded-xl space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                    Generate Missions with AI
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Uses Gemini 2.5 Pro to analyze project documentation and system
                                    prompts to generate comprehensive test scenarios.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                                    Directions for the AI <span className="font-normal normal-case">(optional)</span>
                                </label>
                                <textarea
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60"
                                    rows={3}
                                    placeholder="Ex: Create payment scenarios, the persona should be someone chatting on WhatsApp with direct messages and abbreviations. Focus on PIX key error cases."
                                    value={genPrompt}
                                    onChange={(e) => setGenPrompt(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                        Quantity
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={genCount}
                                        onChange={(e) => setGenCount(Math.max(1, Math.min(20, Number(e.target.value))))}
                                        className="w-16 bg-background border border-border rounded-md px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <Button
                                    variant="primary"
                                    onClick={handleGenerateMissions}
                                    disabled={isGenerating}
                                    className="gap-2 ml-auto"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Spinner className="w-4 h-4" /> Generating...
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
                    </section>

                    {/* Mission List */}
                    {projectMissions.length > 0 && (
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Target className="w-5 h-5 text-primary" />
                                Missions ({projectMissions.length})
                            </h3>
                            <Button
                                onClick={handleRunAllMissions}
                                className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-[0_4px_12px_rgba(16,185,129,0.25)] cursor-pointer"
                            >
                                <Play className="w-4 h-4 fill-current" /> Run All Missions
                            </Button>
                        </div>
                    )}
                    <div id="project-missions-list" className="space-y-3">
                        {projectMissions.map((mission) => {
                            const prompt = (project.system_prompts || []).find(
                                (sp) => sp.id === mission.system_prompt_id
                            );
                            const env = (project.environments || []).find(
                                (e) => e.id === mission.environment_id
                            );
                            return (
                                <div
                                    key={mission.id}
                                    className="border border-border rounded-lg bg-card p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm truncate">
                                            {mission.titulo}
                                        </h4>
                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                            {mission.mission_goal}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            {prompt && (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {prompt.name}
                                                </Badge>
                                            )}
                                            {targetProvider === 'gemini' ? (
                                                <Badge variant="outline" className="text-[10px]">
                                                    Gemini · {targetGeminiModel}
                                                </Badge>
                                            ) : env && (
                                                <Badge variant="outline" className="text-[10px]">
                                                    {env.name}
                                                </Badge>
                                            )}
                                            {Object.keys(mission.variables || {}).length > 0 && (
                                                <Badge variant="outline" className="text-[10px]">
                                                    {Object.keys(mission.variables).length} vars
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigate(`/missions/${mission.id}`)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => navigate(`/run/${mission.id}`)}
                                            className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            Run
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setMissionToDelete(mission)}
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}

                        {projectMissions.length === 0 && (
                            <div className="py-12 text-center border-2 border-dashed border-border rounded-xl">
                                <p className="text-muted-foreground mb-4">
                                    No missions yet. Use AI generation or create manually.
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <Button
                                        onClick={handleGenerateMissions}
                                        disabled={isGenerating}
                                        className="gap-2"
                                    >
                                        <Sparkles className="w-4 h-4" /> Generate with AI
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => navigate('/missions/new?project=' + project.id)}
                                    >
                                        <Plus className="w-4 h-4 mr-2" /> Create Manually
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão de Missão */}
            {missionToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop com blur e animação suave */}
                    <div 
                        className="absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-300 animate-modal-fade-in cursor-pointer"
                        onClick={() => setMissionToDelete(null)}
                    />
                    
                    {/* Caixa do Modal Premium */}
                    <div className="relative bg-gradient-to-b from-[#111827] to-[#0b0f19] border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.8),_inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl max-w-sm w-full p-6 z-10 animate-modal-scale-in overflow-hidden text-center space-y-6">
                        {/* Linha de brilho superior destrutivo */}
                        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                        
                        {/* Ícone de aviso destrutivo com efeitos de luz */}
                        <div className="relative flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                            <div className="absolute inset-0 rounded-full bg-red-500/5 animate-ping opacity-75" />
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        
                        {/* Texto descritivo principal */}
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold tracking-tight text-white">Delete Mission?</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                You are about to permanently delete the mission:
                            </p>
                            <div className="inline-block font-semibold text-white bg-slate-900/60 border border-white/5 px-3 py-1 rounded-lg text-sm max-w-full truncate shadow-inner">
                                "{missionToDelete.titulo}"
                            </div>
                        </div>

                        {/* Card de Aviso Crítico com design moderno */}
                        <div className="bg-red-500/[0.03] border-l-2 border-red-500/60 p-4 rounded-r-lg text-left space-y-1">
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">⚠️ Irreversible Action</span>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                The mission scenario, behavior parameters, and all associated test execution histories will be **permanently deleted**.
                            </p>
                        </div>
                        
                        {/* Botões de Ação Simétricos e Táteis */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setMissionToDelete(null)}
                                className="flex-1 px-4 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-semibold text-xs tracking-wide uppercase transition-all duration-200 cursor-pointer active:scale-[0.98] border-b-[2px] border-b-black/20 hover:border-white/[0.12]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    deleteMission(missionToDelete.id);
                                    setMissionToDelete(null);
                                }}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-bold text-xs tracking-wide uppercase shadow-[0_4px_12px_rgba(239,68,68,0.25)] hover:shadow-[0_4px_16px_rgba(239,68,68,0.35)] hover:-translate-y-[1px] transition-all duration-200 cursor-pointer active:scale-[0.98] active:translate-y-0"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
