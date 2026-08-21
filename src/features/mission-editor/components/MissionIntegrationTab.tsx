import React, { useState } from 'react';
import { HelpCircle, ExternalLink, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Project, Mission, SystemPrompt, Environment, TargetProvider, ApiConfig } from '../../../types';
import { getSuggestedGeminiTargetModels } from '../../../utils/missionTarget';
import { useSettingsStore } from '../../../store/useSettingsStore';

interface MissionIntegrationTabProps {
    formData: Mission;
    onChange: (updated: Mission) => void;
    currentProject?: Project;
    availablePrompts: SystemPrompt[];
    availableEnvs: Environment[];
    targetProvider: TargetProvider;
    targetGeminiModel: string;
    selectedPrompt?: SystemPrompt;
    selectedEnv?: Environment;
    requestNavigate: (path: string) => void;
}

export const MissionIntegrationTab: React.FC<MissionIntegrationTabProps> = ({
    formData,
    onChange,
    currentProject,
    availablePrompts,
    availableEnvs,
    targetProvider,
    targetGeminiModel,
    selectedPrompt,
    selectedEnv,
    requestNavigate,
}) => {
    const { discoveredModels } = useSettingsStore();
    const suggestedModels = getSuggestedGeminiTargetModels(discoveredModels);
    const [showPromptPreview, setShowPromptPreview] = useState(false);
    const [showApiPreview, setShowApiPreview] = useState(false);

    const maskAuth = (val?: string) => {
        if (!val) return '(none)';
        if (val.length <= 15) return '***';
        return val.substring(0, 7) + '...' + val.substring(val.length - 4);
    };

    const handleSystemPromptChange = (val: string) => {
        onChange({ ...formData, system_prompt_id: val });
    };

    const handleEnvironmentChange = (val: string) => {
        onChange({ ...formData, environment_id: val });
    };

    const handleUpdateApiConfig = (field: keyof ApiConfig, val: ApiConfig[keyof ApiConfig]) => {
        onChange({
            ...formData,
            api_config: { ...formData.api_config, [field]: val }
        });
    };

    return (
        <div className="grid grid-cols-1 gap-6">
            {/* System Prompt Selection */}
            {currentProject && (
                <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card shadow-sm">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <h2 className="text-title text-white flex items-center gap-1.5">
                            <span>Target System Prompt</span>
                            <span title="Select which system prompt persona will be applied to the target agent for this specific mission.">
                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                            </span>
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-label text-muted-foreground hover:text-foreground h-8"
                            onClick={() =>
                                requestNavigate(`/projects/${currentProject.id}`)
                            }
                        >
                            <ExternalLink className="w-3 h-3" /> Edit in Project
                        </Button>
                    </div>

                    <select
                        className="w-full h-10 rounded-md border border-input bg-[#1C2026] px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                                className="flex items-center gap-2 text-label text-muted-foreground hover:text-foreground transition-colors"
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
                                    <pre className="text-body text-muted-foreground whitespace-pre-wrap font-mono">
                                        {selectedPrompt.content}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}

                    {!selectedPrompt && formData.system_prompt_id === '' && (
                        <p className="text-body text-muted-foreground">
                            Select a system prompt from the project. The evaluator uses it to
                            grade the agent's behavior.
                        </p>
                    )}
                </section>
            )}

            {/* Target Integration */}
            <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <h2 className="text-title text-white">
                        {currentProject ? 'Project Target Integration' : 'Target Integration'}
                    </h2>
                    {currentProject && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-label text-muted-foreground hover:text-foreground h-8"
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
                                <p className="text-body font-bold text-white">Gemini project target</p>
                                <p className="text-body text-muted-foreground">
                                    This mission will run directly against Gemini using the
                                    project configuration.
                                </p>
                                <p className="text-body text-muted-foreground">
                                    Model: <span className="font-mono">{targetGeminiModel}</span>
                                </p>
                                <p className="text-body text-muted-foreground">
                                    AgentEval reuses the Gemini API key configured in Settings
                                    for the target call.
                                </p>
                            </div>
                        </div>
                    ) : (
                         <>
                            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                                <p className="text-body font-bold text-white">HTTP project target</p>
                                <p className="text-body text-muted-foreground">
                                    The provider is configured at the project level. This mission
                                    only selects which environment should be used.
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-label text-slate-300 flex items-center gap-1.5">
                                    <span>Active Environment</span>
                                    <span title="Select which API environment (e.g. Staging, Production) the test agent will send HTTP requests to.">
                                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                    </span>
                                </label>
                                <select
                                    className="w-full h-10 rounded-md border border-input bg-[#1C2026] px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                                        className="flex items-center gap-2 text-label text-muted-foreground hover:text-foreground transition-colors"
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
                                        <div className="mt-3 p-4 bg-muted rounded-lg border border-border space-y-3 select-none">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <span className="text-label text-muted-foreground block mb-1">
                                                        POST URL
                                                    </span>
                                                    <p className="text-body font-mono break-all mt-0.5 text-white">
                                                        {selectedEnv.api_config.post_url || '(empty)'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-label text-muted-foreground block mb-1">
                                                        GET URL
                                                    </span>
                                                    <p className="text-body font-mono break-all mt-0.5 text-white">
                                                        {selectedEnv.api_config.get_url || '(empty)'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-label text-muted-foreground block mb-1">
                                                    Auth Header
                                                </span>
                                                <p className="text-body font-mono mt-0.5 text-white">
                                                    {maskAuth(selectedEnv.api_config.auth_header)}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-label text-muted-foreground block mb-1">
                                                    Payload Template
                                                </span>
                                                <pre className="text-body font-mono mt-0.5 bg-background p-2 rounded border border-border whitespace-pre-wrap max-h-32 overflow-y-auto">
                                                    {selectedEnv.api_config.payload_template}
                                                </pre>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <span className="text-label text-muted-foreground block mb-1">
                                                        Response Path
                                                    </span>
                                                    <p className="text-body font-mono mt-0.5 text-white">
                                                        {selectedEnv.api_config.response_path || '(auto)'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-label text-muted-foreground block mb-1">
                                                        Polling
                                                    </span>
                                                    <p className="text-body font-mono mt-0.5 text-white tabular-nums">
                                                        {selectedEnv.api_config.polling_interval}ms
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-label text-muted-foreground block mb-1">
                                                        Timeout
                                                    </span>
                                                    <p className="text-body font-mono mt-0.5 text-white tabular-nums">
                                                        {selectedEnv.api_config.max_timeout}s
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!selectedEnv && formData.environment_id === '' && (
                                <p className="text-body text-muted-foreground">
                                    Select an environment to define where the test agent will
                                    send messages.
                                </p>
                            )}
                        </>
                    )
                ) : (
                    // Standalone Mission Mode
                    <div className="space-y-4">
                        <div>
                            <label className="text-label text-slate-300 mb-1 block">
                                Target Provider
                            </label>
                            <select
                                className="w-full h-10 rounded-md border border-input bg-[#1C2026] px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={targetProvider}
                                onChange={(e) => onChange({ ...formData, target_provider: e.target.value as TargetProvider })}
                            >
                                <option value="http">HTTP API</option>
                                <option value="gemini">Gemini Model</option>
                            </select>
                        </div>

                        {targetProvider === 'gemini' ? (
                            <div>
                                <label className="text-label text-slate-300 mb-1 block">
                                    Gemini Model
                                </label>
                                <select
                                    value={targetGeminiModel}
                                    onChange={(e) => onChange({ ...formData, target_gemini_model: e.target.value })}
                                    className="w-full h-10 rounded-md border border-input bg-[#1C2026] px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer font-mono"
                                >
                                    {!suggestedModels.includes(targetGeminiModel) && targetGeminiModel && (
                                        <option value={targetGeminiModel} className="bg-card font-mono">
                                            {targetGeminiModel} (Custom)
                                        </option>
                                    )}
                                    {suggestedModels.map((model) => (
                                        <option key={model} value={model} className="bg-card font-mono">
                                            {model}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-label text-slate-300 mb-1 block">
                                            POST URL
                                        </label>
                                        <Input
                                            placeholder="https://api.example.com/chat"
                                            value={formData.api_config.post_url}
                                            onChange={(e) => handleUpdateApiConfig('post_url', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-label text-slate-300 mb-1 block">
                                            GET URL
                                        </label>
                                        <Input
                                            placeholder="https://api.example.com/messages"
                                            value={formData.api_config.get_url}
                                            onChange={(e) => handleUpdateApiConfig('get_url', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-label text-slate-300 mb-1 block">
                                        Authorization Header
                                    </label>
                                    <Input
                                        placeholder="Bearer token..."
                                        value={formData.api_config.auth_header}
                                        onChange={(e) => handleUpdateApiConfig('auth_header', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-label text-slate-300 mb-1 block">
                                        Payload Template (JSON)
                                    </label>
                                    <textarea
                                        className="w-full h-24 font-mono bg-[#13161B] rounded-md border border-input px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        value={formData.api_config.payload_template}
                                        onChange={(e) => handleUpdateApiConfig('payload_template', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-label text-slate-300 mb-1 block">
                                        Response Data Path
                                    </label>
                                    <Input
                                        placeholder="data.messages[-1].content"
                                        value={formData.api_config.response_path}
                                        onChange={(e) => handleUpdateApiConfig('response_path', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-label text-slate-300 mb-1 block">
                                            Polling Interval (ms)
                                        </label>
                                        <Input
                                            type="number"
                                            value={formData.api_config.polling_interval}
                                            onChange={(e) => handleUpdateApiConfig('polling_interval', parseInt(e.target.value) || 2000)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-label text-slate-300 mb-1 block">
                                            Max Timeout (s)
                                        </label>
                                        <Input
                                            type="number"
                                            value={formData.api_config.max_timeout}
                                            onChange={(e) => handleUpdateApiConfig('max_timeout', parseInt(e.target.value) || 30)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
};
