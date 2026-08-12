import React from 'react';
import { Save, Check, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Project } from '../../../types';
import { SettingsInfoSubTab } from './SettingsInfoSubTab';
import { SettingsDocsSubTab } from './SettingsDocsSubTab';
import { SettingsPromptsSubTab } from './SettingsPromptsSubTab';
import { SettingsEnvsSubTab } from './SettingsEnvsSubTab';

type SettingsTab = 'info' | 'docs' | 'prompts' | 'environments';

interface ProjectSettingsTabProps {
    project: Project;
    settingsTab: SettingsTab;
    onSettingsTabChange: (subtab: SettingsTab) => void;
    saveStatus: 'idle' | 'saved' | 'error';
    onSave: () => void;
    onChange: (updatedProject: Project) => void;
    isDirty?: boolean;
}

export const ProjectSettingsTab: React.FC<ProjectSettingsTabProps> = ({
    project,
    settingsTab,
    onSettingsTabChange,
    saveStatus,
    onSave,
    onChange,
    isDirty = false,
}) => {
    const targetProvider = project.target_provider || 'http';

    const subTabs = [
        { key: 'info' as const, label: 'Basic Info' },
        { key: 'docs' as const, label: 'Documentation' },
        { key: 'prompts' as const, label: 'System Prompts' },
        ...(targetProvider !== 'gemini' ? [{ key: 'environments' as const, label: 'Environments' }] : []),
    ];

    return (
        <div className="space-y-6">
            {/* Header bar wrapping sub-tabs and premium Save button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
                <div className="flex flex-wrap gap-2.5 p-1.5 bg-[#1C2026] rounded-xl border border-border/50 w-fit">
                    {subTabs.map((tab) => (
                        <button
                            key={tab.key}
                            id={`project-tab-${tab.key}`}
                            onClick={() => onSettingsTabChange(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-label transition-all duration-300 rounded-lg cursor-pointer ${
                                settingsTab === tab.key
                                    ? 'bg-[#272D35] text-white border border-border/40 shadow-sm scale-[1.02]'
                                    : 'text-muted-foreground hover:text-slate-200'
                            }`}
                        >
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    {saveStatus === 'saved' && (
                        <span className="text-label text-emerald-400 flex items-center gap-1.5 animate-fade-in bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                            <Check className="w-3.5 h-3.5" /> Project Saved Successfully
                        </span>
                    )}
                    {saveStatus === 'error' && (
                        <span className="text-label text-rose-400 flex items-center gap-1.5 animate-fade-in bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">
                            <AlertCircle className="w-3.5 h-3.5" /> Error Saving Changes
                        </span>
                    )}
                    <Button
                        onClick={onSave}
                        className={`gap-2 bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] hover:scale-[1.02] active:scale-[0.98] text-white shadow-lg shadow-[#4A72FF]/10 cursor-pointer h-10 px-5 ${
                            isDirty ? 'ring-2 ring-amber-400/50' : ''
                        }`}
                    >
                        {isDirty && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes" />
                        )}
                        <Save className="w-4 h-4" />
                        <span>{isDirty ? 'Save Project *' : 'Save Project'}</span>
                    </Button>
                </div>
            </div>

            {/* Sub-tab Rendering */}
            {settingsTab === 'info' && (
                <SettingsInfoSubTab project={project} onChange={onChange} />
            )}

            {settingsTab === 'docs' && (
                <SettingsDocsSubTab project={project} onChange={onChange} />
            )}

            {settingsTab === 'prompts' && (
                <SettingsPromptsSubTab project={project} onChange={onChange} />
            )}

            {settingsTab === 'environments' && targetProvider !== 'gemini' && (
                <SettingsEnvsSubTab project={project} onChange={onChange} />
            )}
        </div>
    );
};
