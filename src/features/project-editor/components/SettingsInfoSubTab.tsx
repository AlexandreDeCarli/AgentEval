import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Project, TargetProvider } from '../../../types';
import { 
    DEFAULT_GEMINI_TARGET_MODEL, 
    SUGGESTED_GEMINI_TARGET_MODELS, 
    getProjectGeminiModel 
} from '../../../utils/missionTarget';

interface SettingsInfoSubTabProps {
    project: Project;
    onChange: (project: Project) => void;
}

export const SettingsInfoSubTab: React.FC<SettingsInfoSubTabProps> = ({
    project,
    onChange,
}) => {
    const handleTargetProviderChange = (value: TargetProvider) => {
        const updatedProject = {
            ...project,
            target_provider: value,
        };
        onChange({
            ...updatedProject,
            target_gemini_model:
                value === 'gemini'
                    ? getProjectGeminiModel(updatedProject)
                    : project.target_gemini_model,
        });
    };

    const targetProvider = project.target_provider || 'http';
    const targetGeminiModel = project.target_gemini_model || DEFAULT_GEMINI_TARGET_MODEL;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Project Info Card */}
            <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                    <h2 className="text-base font-bold text-white uppercase tracking-wider border-b border-border/40 pb-2">Project Info</h2>
                    <div>
                        <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <span>Name</span>
                            <span title="The name of your project, grouping together a set of system prompts, environments, and testing missions.">
                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                            </span>
                        </label>
                        <Input
                            value={project.name}
                            onChange={(e) => onChange({ ...project, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <span>Description</span>
                            <span title="A brief description of what this project tests (e.g. 'Customer Support AI evaluation').">
                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                            </span>
                        </label>
                        <textarea
                            className="w-full h-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={project.description}
                            onChange={(e) =>
                                onChange({ ...project, description: e.target.value })
                            }
                        />
                    </div>
                </div>
            </section>

            {/* Target Integration Card */}
            <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                    <h2 className="text-base font-bold text-white uppercase tracking-wider border-b border-border/40 pb-2">
                        Target Integration
                    </h2>

                    <div>
                        <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <span>Project Target Provider</span>
                            <span title="Select whether your AI agent is accessed via an HTTP API Endpoint or directly instantiated using a standard Gemini LLM.">
                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                            </span>
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
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                            This setting applies to all missions in the project. Missions only
                            choose which prompt to test and, for HTTP projects, which
                            environment to use.
                        </p>
                    </div>

                    {targetProvider === 'gemini' ? (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                                    <span>Gemini Model</span>
                                    <span title="Specify which Gemini LLM model should be used as the target agent (e.g., gemini-1.5-pro or gemini-1.5-flash).">
                                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                    </span>
                                </label>
                                <Input
                                    list="project-gemini-model-suggestions"
                                    value={targetGeminiModel}
                                    onChange={(e) =>
                                        onChange({
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
                            <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-2">
                                <p className="text-xs font-bold text-white uppercase tracking-wider">Gemini project mode</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    AgentEval will reuse the Gemini API key configured in
                                    Settings for the target call.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-2">
                            <p className="text-xs font-bold text-white uppercase tracking-wider">HTTP project mode</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Missions in this project will run against one of the
                                environments configured in the Environments tab.
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};
