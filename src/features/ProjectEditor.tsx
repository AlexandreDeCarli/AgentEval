import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProjectStore } from '../store/useProjectStore';
import { useMissionStore } from '../store/useMissionStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { Project, SystemPrompt, Environment, ApiConfig } from '../types';
import { generateMissionsFromAI } from '../services/missionGenerator';
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
    Copy,
    Pencil,
    Check,
    AlertCircle,
} from 'lucide-react';

type Tab = 'info' | 'prompts' | 'environments' | 'missions';

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
    const { projects, updateProject } = useProjectStore();
    const { missions, addMission } = useMissionStore();
    const { geminiApiKey } = useSettingsStore();

    const [project, setProject] = useState<Project | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('info');
    const [isGenerating, setIsGenerating] = useState(false);
    const [genError, setGenError] = useState('');
    const [genPrompt, setGenPrompt] = useState('');
    const [genCount, setGenCount] = useState(8);
    const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
    const [expandedEnv, setExpandedEnv] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

    useEffect(() => {
        const found = projects.find((p) => p.id === id);
        if (found) {
            setProject({
                ...found,
                documentation: found.documentation || '',
                description: found.description || '',
                system_prompts: found.system_prompts || [],
                environments: found.environments || [],
            });
        } else {
            navigate('/projects');
        }
    }, [id, projects, navigate]);

    if (!project) return null;

    const projectMissions = missions.filter((m) => m.project_id === project.id);

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

    const handleUpdateEnv = (envId: string, field: string, value: any) => {
        setProject({
            ...project,
            environments: project.environments.map((e) =>
                e.id === envId ? { ...e, [field]: value } : e
            ),
        });
    };

    const handleUpdateEnvApiConfig = (envId: string, field: keyof ApiConfig, value: any) => {
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
            setActiveTab('missions');
        } catch (e: any) {
            setGenError(e.message || 'Failed to generate missions');
        } finally {
            setIsGenerating(false);
        }
    };

    const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
        { key: 'info', label: 'Info & Docs', icon: <FileText className="w-4 h-4" /> },
        {
            key: 'prompts',
            label: 'System Prompts',
            icon: <FileText className="w-4 h-4" />,
            count: project.system_prompts.length,
        },
        {
            key: 'environments',
            label: 'Environments',
            icon: <Server className="w-4 h-4" />,
            count: project.environments.length,
        },
        {
            key: 'missions',
            label: 'Missions',
            icon: <Target className="w-4 h-4" />,
            count: projectMissions.length,
        },
    ];

    return (
        <div className="p-8 max-w-5xl mx-auto pb-24">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
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

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab.key
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.count !== undefined && (
                            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                                {tab.count}
                            </Badge>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab: Info & Docs */}
            {activeTab === 'info' && (
                <div className="space-y-6">
                    <section className="space-y-4 border border-border p-6 rounded-xl bg-card">
                        <h2 className="text-xl font-semibold border-b border-border pb-2">Project Info</h2>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Name</label>
                            <Input
                                value={project.name}
                                onChange={(e) => setProject({ ...project, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Description</label>
                            <textarea
                                className="w-full h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={project.description}
                                onChange={(e) =>
                                    setProject({ ...project, description: e.target.value })
                                }
                            />
                        </div>
                    </section>

                    <section className="space-y-4 border border-border p-6 rounded-xl bg-card">
                        <h2 className="text-xl font-semibold border-b border-border pb-2">
                            Project Documentation (Markdown)
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            Paste the full documentation of the target system here. The AI will use
                            it to generate intelligent test missions.
                        </p>
                        <textarea
                            className="w-full h-96 font-mono rounded-md border border-input bg-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={project.documentation}
                            onChange={(e) =>
                                setProject({ ...project, documentation: e.target.value })
                            }
                            placeholder="# System Documentation&#10;&#10;Paste the complete documentation of the target system here..."
                        />
                    </section>
                </div>
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
                    <section className="border border-primary/30 bg-primary/5 p-6 rounded-xl space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                Generate Missions with AI
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Uses Gemini 3.1 Pro to analyze project documentation and system prompts to generate test scenarios.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                                    Directions for the AI <span className="font-normal normal-case">(optional)</span>
                                </label>
                                <textarea
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60"
                                    rows={3}
                                    placeholder="Ex: Crie cenários de pagamento, a persona deve ser alguém conversando pelo WhatsApp com mensagens diretas e abreviações. Foque em casos de erro de chave PIX."
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
                    <div className="space-y-3">
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
                                            {env && (
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
        </div>
    );
};
