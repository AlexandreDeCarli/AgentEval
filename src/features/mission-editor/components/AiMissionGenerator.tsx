import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { SystemPrompt } from '../../../types';

interface AiMissionGeneratorProps {
    onBack: () => void;
    aiPrompt: string;
    setAiPrompt: (value: string) => void;
    aiCount: number;
    setAiCount: (value: number) => void;
    isGenerating: boolean;
    genError: string;
    handleAiGenerate: () => void;
    systemPrompts: SystemPrompt[];
    selectedSystemPromptIds: string[];
    setSelectedSystemPromptIds: (value: string[]) => void;
}

export const AiMissionGenerator: React.FC<AiMissionGeneratorProps> = ({
    onBack,
    aiPrompt,
    setAiPrompt,
    aiCount,
    setAiCount,
    isGenerating,
    genError,
    handleAiGenerate,
    systemPrompts,
    selectedSystemPromptIds,
    setSelectedSystemPromptIds,
}) => {
    const selectedPromptIdSet = new Set(selectedSystemPromptIds);
    const selectedPromptCount = systemPrompts.filter((prompt) =>
        selectedPromptIdSet.has(prompt.id)
    ).length;

    const togglePrompt = (promptId: string) => {
        if (selectedPromptIdSet.has(promptId)) {
            setSelectedSystemPromptIds(
                selectedSystemPromptIds.filter((selectedId) => selectedId !== promptId)
            );
            return;
        }
        setSelectedSystemPromptIds([...selectedSystemPromptIds, promptId]);
    };

    return (
        <div className="p-8 max-w-2xl mx-auto pb-24 animate-fade-in select-none">
            <div className="flex items-center gap-4 mb-8">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
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
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                    System prompts
                                </label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {selectedPromptCount} of {systemPrompts.length} selected
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setSelectedSystemPromptIds(
                                            systemPrompts.map((prompt) => prompt.id)
                                        )
                                    }
                                    disabled={isGenerating || selectedPromptCount === systemPrompts.length}
                                >
                                    All
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedSystemPromptIds([])}
                                    disabled={isGenerating || selectedPromptCount === 0}
                                >
                                    Clear
                                </Button>
                            </div>
                        </div>

                        <div className="max-h-56 overflow-y-auto rounded-xl border border-border/60 bg-[#13161B] divide-y divide-border/50">
                            {systemPrompts.map((prompt) => {
                                const checked = selectedPromptIdSet.has(prompt.id);
                                return (
                                    <label
                                        key={prompt.id}
                                        className={`flex items-start gap-3 p-3 transition-colors cursor-pointer ${
                                            checked ? 'bg-primary/10' : 'hover:bg-muted/30'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => togglePrompt(prompt.id)}
                                            disabled={isGenerating}
                                            className="mt-0.5 h-4 w-4 rounded border-border bg-input accent-[#4A72FF] cursor-pointer disabled:cursor-not-allowed"
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-bold text-white truncate">
                                                {prompt.name || 'Untitled prompt'}
                                            </span>
                                            <span className="mt-1 block text-xs text-muted-foreground font-mono">
                                                {prompt.content.length} chars
                                            </span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

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
                            disabled={isGenerating || selectedPromptCount === 0}
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
};
