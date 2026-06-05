import React, { useState } from 'react';
import { Plus, Trash2, Server, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Project, Environment, ApiConfig } from '../../../types';

interface SettingsEnvsSubTabProps {
    project: Project;
    onChange: (project: Project) => void;
}

const defaultApiConfig: ApiConfig = {
    post_url: '',
    get_url: '',
    auth_header: '',
    payload_template: '{\n  "message": "{{message}}"\n}',
    response_path: '',
    polling_interval: 2000,
    max_timeout: 30,
};

export const SettingsEnvsSubTab: React.FC<SettingsEnvsSubTabProps> = ({
    project,
    onChange,
}) => {
    const [expandedEnv, setExpandedEnv] = useState<string | null>(null);

    const handleAddEnvironment = () => {
        const newEnv: Environment = {
            id: crypto.randomUUID(),
            name: 'New Environment',
            api_config: { ...defaultApiConfig },
        };
        onChange({ 
            ...project, 
            environments: [...project.environments, newEnv] 
        });
        setExpandedEnv(newEnv.id);
    };

    const handleUpdateEnv = (envId: string, field: 'name', value: string) => {
        onChange({
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
        onChange({
            ...project,
            environments: project.environments.map((e) =>
                e.id === envId
                    ? { ...e, api_config: { ...e.api_config, [field]: value } }
                    : e
            ),
        });
    };

    const handleDeleteEnv = (envId: string) => {
        onChange({
            ...project,
            environments: project.environments.filter((e) => e.id !== envId),
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center select-none">
                <p className="text-body text-muted-foreground">
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
                    className="border border-border/50 rounded-xl bg-card overflow-hidden shadow-sm"
                >
                    <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors select-none"
                        onClick={() =>
                            setExpandedEnv(expandedEnv === env.id ? null : env.id)
                        }
                    >
                        <div className="flex items-center gap-3">
                            <Server className="w-4 h-4 text-muted-foreground" />
                            <span className="text-body font-bold text-white">
                                {env.name || 'Untitled'}
                            </span>
                            {env.api_config.post_url && (
                                <span className="text-label text-muted-foreground truncate max-w-xs font-mono">
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
                        <div className="p-4 border-t border-border/40 space-y-4">
                            <Input
                                placeholder="Environment Name (e.g., Production, Staging)"
                                value={env.name}
                                onChange={(e) =>
                                    handleUpdateEnv(env.id, 'name', e.target.value)
                                }
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-label text-slate-300 mb-1 flex items-center gap-1.5">
                                        <span>POST URL</span>
                                        <span title="The HTTP POST endpoint of your agent where AgentEval sends the conversation history payload.">
                                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                        </span>
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
                                    <label className="text-label text-slate-300 mb-1 flex items-center gap-1.5">
                                        <span>GET URL</span>
                                        <span title="Optional. The HTTP GET endpoint of your agent used if you require polling for asynchronous message replies.">
                                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                        </span>
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
                                <label className="text-label text-slate-300 mb-1 flex items-center gap-1.5">
                                    <span>Authorization Header</span>
                                    <span title="Optional. The HTTP Authorization header value sent with requests (e.g. 'Bearer your-api-key').">
                                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                    </span>
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
                                <label className="text-label text-slate-300 mb-1 flex items-center gap-1.5">
                                    <span>Payload Template (JSON)</span>
                                    <span title="The JSON body template sent in the POST request. Use {{history}} to inject the chat list array.">
                                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                    </span>
                                </label>
                                <textarea
                                    className="w-full h-24 font-mono bg-[#13161B] rounded-md border border-input px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                                <label className="text-label text-slate-300 mb-1 flex items-center gap-1.5">
                                    <span>Response Data Path</span>
                                    <span title="JSON path expression to extract the response text from your agent's API response (e.g., 'choices[0].message.content').">
                                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                    </span>
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
                                    <label className="text-label text-slate-300 mb-1 flex items-center gap-1.5">
                                        <span>Polling Interval (ms)</span>
                                        <span title="The duration to wait between HTTP GET polling requests when checking for asynchronous replies.">
                                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                        </span>
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
                                    <label className="text-label text-slate-300 mb-1 flex items-center gap-1.5">
                                        <span>Max Timeout (s)</span>
                                        <span title="Maximum seconds the system will wait for your agent's API to respond before marking the turn as failed.">
                                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                        </span>
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
                <div className="py-12 text-center border-2 border-dashed border-border/50 rounded-xl select-none">
                    <p className="text-body text-muted-foreground mb-4">
                        No environments configured yet.
                    </p>
                    <Button onClick={handleAddEnvironment} variant="outline" className="gap-2">
                        <Plus className="w-4 h-4" /> Add first environment
                    </Button>
                </div>
            )}
        </div>
    );
};
