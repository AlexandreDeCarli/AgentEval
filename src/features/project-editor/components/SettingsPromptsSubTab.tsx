import React, { useState } from 'react';
import { Plus, Trash2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Project, SystemPrompt } from '../../../types';

interface SettingsPromptsSubTabProps {
    project: Project;
    onChange: (project: Project) => void;
}

export const SettingsPromptsSubTab: React.FC<SettingsPromptsSubTabProps> = ({
    project,
    onChange,
}) => {
    const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

    const handleAddPrompt = () => {
        const newPrompt: SystemPrompt = {
            id: crypto.randomUUID(),
            name: 'New Prompt',
            content: '',
        };
        onChange({ 
            ...project, 
            system_prompts: [...project.system_prompts, newPrompt] 
        });
        setExpandedPrompt(newPrompt.id);
    };

    const handleUpdatePrompt = (promptId: string, field: keyof SystemPrompt, value: string) => {
        onChange({
            ...project,
            system_prompts: project.system_prompts.map((sp) =>
                sp.id === promptId ? { ...sp, [field]: value } : sp
            ),
        });
    };

    const handleDeletePrompt = (promptId: string) => {
        onChange({
            ...project,
            system_prompts: project.system_prompts.filter((sp) => sp.id !== promptId),
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center select-none">
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Add the system prompts used by the target's AI agents.
                </p>
                <Button variant="outline" size="sm" onClick={handleAddPrompt} className="gap-2 text-xs font-bold uppercase">
                    <Plus className="w-4 h-4" /> Add Prompt
                </Button>
            </div>

            {project.system_prompts.map((sp) => (
                <div
                    key={sp.id}
                    className="border border-border/50 rounded-xl bg-card overflow-hidden shadow-sm"
                >
                    <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors select-none"
                        onClick={() =>
                            setExpandedPrompt(expandedPrompt === sp.id ? null : sp.id)
                        }
                    >
                        <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-bold text-sm text-white">{sp.name || 'Untitled'}</span>
                            <span className="text-[10px] text-muted-foreground font-semibold bg-[#272D35] px-2 py-0.5 rounded border border-border/40 font-mono">
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
                        <div className="p-4 border-t border-border/40 space-y-4">
                            <Input
                                placeholder="Prompt Name (e.g., Generic Agent, Payments Agent)"
                                value={sp.name}
                                onChange={(e) =>
                                    handleUpdatePrompt(sp.id, 'name', e.target.value)
                                }
                            />
                            <textarea
                                className="w-full h-64 font-mono rounded-md border border-input bg-[#13161B] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring leading-relaxed"
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
                <div className="py-12 text-center border-2 border-dashed border-border/50 rounded-xl select-none">
                    <p className="text-muted-foreground mb-4 text-xs font-semibold">
                        No system prompts added yet.
                    </p>
                    <Button onClick={handleAddPrompt} variant="outline" className="gap-2 font-bold text-xs uppercase">
                        <Plus className="w-4 h-4" /> Add first prompt
                    </Button>
                </div>
            )}
        </div>
    );
};
