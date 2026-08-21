import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Project, TargetProvider } from '../../../types';
import { 
    DEFAULT_GEMINI_TARGET_MODEL, 
    getProjectGeminiModel,
    getSuggestedGeminiTargetModels 
} from '../../../utils/missionTarget';
import { useSettingsStore } from '../../../store/useSettingsStore';

interface SettingsInfoSubTabProps {
    project: Project;
    onChange: (project: Project) => void;
}

export const SettingsInfoSubTab: React.FC<SettingsInfoSubTabProps> = ({
    project,
    onChange,
}) => {
    const { discoveredModels } = useSettingsStore();
    const suggestedModels = getSuggestedGeminiTargetModels(discoveredModels);

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
                    <h2 className="text-title text-white border-b border-border/40 pb-2 mb-4 block">Project Info</h2>
                    <div>
                        <label className="text-label text-slate-300 mb-1.5 flex items-center gap-1.5">
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
                        <label className="text-label text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <span>Description</span>
                            <span title="A brief description of what this project tests (e.g. 'Customer Support AI evaluation').">
                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                            </span>
                        </label>
                        <textarea
                            className="w-full h-32 rounded-md border border-input bg-transparent px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    <h2 className="text-title text-white border-b border-border/40 pb-2 mb-4 block">
                        Target Integration
                    </h2>

                    <div>
                        <label className="text-label text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <span>Project Target Provider</span>
                            <span title="Select whether your AI agent is accessed via an HTTP API Endpoint or directly instantiated using a standard Gemini LLM.">
                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                            </span>
                        </label>
                        <select
                            className="w-full h-10 rounded-md border border-input bg-[#1C2026] px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={targetProvider}
                            onChange={(e) =>
                                handleTargetProviderChange(e.target.value as TargetProvider)
                            }
                        >
                            <option value="http">HTTP API</option>
                            <option value="gemini">Gemini</option>
                        </select>
                        <p className="text-body text-muted-foreground mt-2">
                            This setting applies to all missions in the project. Missions only
                            choose which prompt to test and, for HTTP projects, which
                            environment to use.
                        </p>
                    </div>

                    {targetProvider === 'gemini' ? (
                        <div className="space-y-3">
                            <div>
                                <label className="text-label text-slate-300 mb-1 flex items-center gap-1.5">
                                    <span>Gemini Model</span>
                                    <span title="Specify which Gemini LLM model should be used as the target agent (e.g., gemini-1.5-pro or gemini-1.5-flash).">
                                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                    </span>
                                </label>
                                <select
                                    value={targetGeminiModel}
                                    onChange={(e) =>
                                        onChange({
                                            ...project,
                                            target_gemini_model: e.target.value,
                                        })
                                    }
                                    className="w-full h-10 rounded-md border border-input bg-[#1C2026] px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
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
                            <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-2">
                                <p className="text-label text-white block mb-1">Gemini project mode</p>
                                <p className="text-body text-muted-foreground">
                                    AgentEval will reuse the Gemini API key configured in
                                    Settings for the target call.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-2">
                            <p className="text-label text-white block mb-1">HTTP project mode</p>
                            <p className="text-body text-muted-foreground">
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
