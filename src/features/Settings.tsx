import React, { useState, useCallback, useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Key, Cpu, Info } from 'lucide-react';

interface ModelInfo {
    id: string;
    name: string;
    isFreeTier: boolean;
    inputCostPaid: string;
    outputCostPaid: string;
    rpmLimitFree?: number;
    rpdLimitFree?: number;
    tpmLimitFree?: number;
    description: string;
    contextLimit: string;
    releaseDate?: string;
    knowledgeCutoff?: string;
}

const EVAL_MODELS: ModelInfo[] = [
    {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        isFreeTier: false,
        inputCostPaid: '$1.25 (<=200K) / $2.50 (>200K)',
        outputCostPaid: '$10.00 (<=200K) / $15.00 (>200K)',
        description: 'Our previous generation advanced reasoning model, which excels at coding and complex reasoning tasks.',
        contextLimit: '2M tokens',
        releaseDate: 'Jun. 17, 2025',
        knowledgeCutoff: 'Jan. 2025'
    },
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        isFreeTier: true,
        inputCostPaid: '$0.30',
        outputCostPaid: '$2.50',
        rpmLimitFree: 5,
        rpdLimitFree: 20,
        tpmLimitFree: 250000,
        description: 'Our hybrid reasoning model, with a 1M token context window and thinking budgets.',
        contextLimit: '1M tokens',
        releaseDate: 'Jun. 9, 2025',
        knowledgeCutoff: 'Jan. 2025'
    },
    {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash-Lite',
        isFreeTier: true,
        inputCostPaid: '$0.10',
        outputCostPaid: '$0.40',
        rpmLimitFree: 10,
        rpdLimitFree: 20,
        tpmLimitFree: 250000,
        description: 'Our smallest and most cost effective model, built for at scale usage.',
        contextLimit: '1M tokens',
        releaseDate: 'Jul. 14, 2025',
        knowledgeCutoff: 'Jan. 2025'
    },
    {
        id: 'gemini-3.5-flash',
        name: 'Gemini 3.5 Flash (Default)',
        isFreeTier: true,
        inputCostPaid: '$1.50',
        outputCostPaid: '$9.00',
        rpmLimitFree: 5,
        rpdLimitFree: 20,
        tpmLimitFree: 250000,
        description: 'Our most intelligent model for sustained frontier performance in agentic and coding tasks.',
        contextLimit: '1M tokens',
        releaseDate: 'May 19, 2026',
        knowledgeCutoff: 'Jan. 2025'
    },
    {
        id: 'gemini-3.1-flash-lite',
        name: 'Gemini 3.1 Flash-Lite',
        isFreeTier: true,
        inputCostPaid: '$0.25 (Text) / $0.50 (Audio)',
        outputCostPaid: '$1.50',
        rpmLimitFree: 15,
        rpdLimitFree: 500,
        tpmLimitFree: 250000,
        description: 'Our most cost-efficient model, optimized for high-volume agentic tasks, translation, and simple data processing.',
        contextLimit: '1M tokens',
        releaseDate: 'May 7, 2026',
        knowledgeCutoff: 'Jan. 2025'
    },
    {
        id: 'gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro Preview',
        isFreeTier: false,
        inputCostPaid: '$2.00 (<=200K) / $4.00 (>200K)',
        outputCostPaid: '$12.00 (<=200K) / $18.00 (>200K)',
        description: 'Our latest SOTA reasoning model with unprecedented depth and nuance, and powerful multimodal understanding and coding capabilities.',
        contextLimit: '2M tokens',
        releaseDate: 'Feb. 12, 2026',
        knowledgeCutoff: 'Jan. 2025'
    },
    {
        id: 'gemini-3-flash-preview',
        name: 'Gemini 3 Flash Preview',
        isFreeTier: true,
        inputCostPaid: '$0.50',
        outputCostPaid: '$3.00',
        rpmLimitFree: 5,
        rpdLimitFree: 20,
        tpmLimitFree: 250000,
        description: 'Our most intelligent model built for speed, combining frontier intelligence with superior search and grounding.',
        contextLimit: '1M tokens',
        releaseDate: 'Dec. 17, 2025',
        knowledgeCutoff: 'Jan. 2025'
    },
    {
        id: 'gemini-flash-latest',
        name: 'Gemini Flash Latest (Alias to 3.5 Flash)',
        isFreeTier: true,
        inputCostPaid: '$1.50',
        outputCostPaid: '$9.00',
        rpmLimitFree: 5,
        rpdLimitFree: 20,
        tpmLimitFree: 250000,
        description: 'An alias to our latest Flash model which changes over time. Currently points to gemini-3.5-flash.',
        contextLimit: '1M tokens',
        releaseDate: 'Dec. 17, 2025',
        knowledgeCutoff: 'Jan. 2025'
    },
    {
        id: 'gemini-flash-lite-latest',
        name: 'Gemini Flash-Lite Latest (Alias to 3.1 Flash-Lite)',
        isFreeTier: true,
        inputCostPaid: '$0.25 (Text) / $0.50 (Audio)',
        outputCostPaid: '$1.50',
        rpmLimitFree: 15,
        rpdLimitFree: 500,
        tpmLimitFree: 250000,
        description: 'An alias to our latest Flash-Lite model which changes over time. Currently points to gemini-3.1-flash-lite.',
        contextLimit: '1M tokens',
        releaseDate: 'May 7, 2026',
        knowledgeCutoff: 'Jan. 2025'
    },
    {
        id: 'gemini-pro-latest',
        name: 'Gemini Pro Latest (Alias to 3.1 Pro Preview)',
        isFreeTier: false,
        inputCostPaid: '$2.00 (<=200K) / $4.00 (>200K)',
        outputCostPaid: '$12.00 (<=200K) / $18.00 (>200K)',
        description: 'An alias to our latest Pro model which changes over time. Currently points to gemini-3.1-pro-preview.',
        contextLimit: '2M tokens',
        releaseDate: 'Feb. 12, 2026',
        knowledgeCutoff: 'Jan. 2025'
    }
];

export const Settings: React.FC = () => {
    const { geminiApiKey, setGeminiApiKey, evaluatorModel, setEvaluatorModel } = useSettingsStore();

    const [inputKey, setInputKey] = useState(geminiApiKey);
    const [selectedModel, setSelectedModel] = useState(evaluatorModel);
    const [showKey, setShowKey] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setInputKey(geminiApiKey);
        setSelectedModel(evaluatorModel);
    }, [geminiApiKey, evaluatorModel]);

    const handleSave = useCallback(() => {
        setGeminiApiKey(inputKey);
        setEvaluatorModel(selectedModel);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }, [inputKey, selectedModel, setGeminiApiKey, setEvaluatorModel]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave]);

    const activeModelInfo = EVAL_MODELS.find(m => m.id === selectedModel) || EVAL_MODELS[0];

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-8">
            <div className="select-none">
                <h1 className="text-display text-white">Settings</h1>
                <p className="text-label text-muted-foreground mt-1">Configure global application settings.</p>
            </div>

            <div className="border border-border bg-card rounded-xl shadow-sm p-6 space-y-8">
                {/* Section 1: API Keys */}
                <div className="space-y-4">
                    <h2 className="text-title flex items-center gap-2">
                        <Key className="w-5 h-5 text-primary" /> API Keys
                    </h2>
                    <p className="text-body text-muted-foreground max-w-[75ch]">
                        The Tester and Evaluator agents use Gemini. If a project tests a Gemini
                        model directly, AgentEval reuses this same Google AI Studio API key for the
                        target call.
                    </p>

                    <div className="space-y-2">
                        <label className="text-label">Gemini API Key</label>
                        <div className="flex gap-3">
                            <Input
                                type={showKey ? "text" : "password"}
                                value={inputKey}
                                onChange={(e) => setInputKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="font-mono bg-background"
                            />
                            <Button variant="outline" onClick={() => setShowKey(!showKey)}>
                                {showKey ? 'Hide' : 'Show'}
                            </Button>
                        </div>
                        <p className="text-label text-muted-foreground">
                            Stored locally in AgentEval settings on this machine.
                        </p>
                    </div>
                </div>

                {/* Section 2: Evaluator Agent Configuration */}
                <div className="pt-6 border-t border-border space-y-4">
                    <h2 className="text-title flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-purple-400" /> Evaluator Agent Configuration
                    </h2>
                    <p className="text-body text-muted-foreground max-w-[75ch]">
                        Choose the model that AgentEval will use to analyze, grade, and generate prompt improvements for the final conversational transcripts.
                    </p>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-label">Evaluation Model</label>
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full bg-background border border-border/80 focus:border-primary/80 rounded-lg p-2.5 text-body text-white outline-none cursor-pointer hover:bg-muted/40 transition-colors"
                            >
                                {EVAL_MODELS.map((model) => (
                                    <option key={model.id} value={model.id} className="bg-card">
                                        {model.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Model Pricing & Limits Info Card */}
                        <div className="border border-border/50 bg-[#1C2026]/40 p-5 rounded-xl space-y-3 animate-fade-in">
                            <div className="flex items-start justify-between">
                                <h3 className="text-title text-sm text-white font-bold">{activeModelInfo.name}</h3>
                                {!activeModelInfo.isFreeTier && (
                                    <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                        Paid Tier Only
                                    </span>
                                )}
                            </div>
                            <p className="text-body text-slate-300 text-xs italic">
                                {activeModelInfo.description}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/30">
                                {/* Pricing column */}
                                <div className="space-y-1.5">
                                    <span className="text-label text-muted-foreground">Paid Tier Pricing (per 1M tokens)</span>
                                    <div className="space-y-0.5 font-mono text-xs tabular-nums text-white">
                                        <div>Input Cost: <span className="font-bold">{activeModelInfo.inputCostPaid} USD</span></div>
                                        <div>Output Cost: <span className="font-bold">{activeModelInfo.outputCostPaid} USD</span></div>
                                    </div>
                                </div>

                                {/* Free Tier column */}
                                <div className="space-y-1.5">
                                    <span className="text-label text-muted-foreground">Free Tier Limits</span>
                                    {activeModelInfo.isFreeTier ? (
                                        <div className="space-y-0.5 font-mono text-xs tabular-nums text-emerald-400">
                                            <div>RPM: <span className="font-bold">{activeModelInfo.rpmLimitFree} reqs/min</span></div>
                                            <div>RPD: <span className="font-bold">{activeModelInfo.rpdLimitFree?.toLocaleString()} reqs/day</span></div>
                                            <div>TPM: <span className="font-bold">{activeModelInfo.tpmLimitFree?.toLocaleString()} tokens/min</span></div>
                                        </div>
                                    ) : (
                                        <div className="font-mono text-xs text-rose-400 font-bold flex items-center gap-1.5">
                                            <Info className="w-3.5 h-3.5" /> No Free Tier Available
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-2 border-t border-border/30 flex flex-col gap-1 text-[10px] text-muted-foreground leading-relaxed font-mono">
                                <div>Max Context Window: <span className="text-slate-300">{activeModelInfo.contextLimit}</span></div>
                                {activeModelInfo.releaseDate && (
                                    <div>Release Date: <span className="text-slate-300">{activeModelInfo.releaseDate}</span></div>
                                )}
                                {activeModelInfo.knowledgeCutoff && (
                                    <div>Knowledge Cutoff: <span className="text-slate-300">{activeModelInfo.knowledgeCutoff}</span></div>
                                )}
                                <div className="italic text-[9px] pt-1">
                                    * Rate pricing and limits are governed directly by Google AI Studio's terms.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save controls */}
                <div className="pt-4 border-t border-border flex items-center gap-4">
                    <Button onClick={handleSave}>Save Settings</Button>
                    {saved && <span className="text-body text-green-500 font-medium">Saved successfully!</span>}
                </div>
            </div>
        </div>
    );
};
