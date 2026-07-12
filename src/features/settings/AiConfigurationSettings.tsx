import React, { useCallback, useEffect, useState } from 'react';
import { Cpu, Eye, EyeOff, Info, Key } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EVALUATOR_MODELS } from '../../config/geminiModels';
import { useSettingsStore } from '../../store/useSettingsStore';

export const AiConfigurationSettings: React.FC = () => {
    const { geminiApiKey, setGeminiApiKey, evaluatorModel, setEvaluatorModel } = useSettingsStore();
    const [inputKey, setInputKey] = useState(geminiApiKey);
    const [selectedModel, setSelectedModel] = useState(() =>
        EVALUATOR_MODELS.some((model) => model.id === evaluatorModel)
            ? evaluatorModel
            : EVALUATOR_MODELS[0].id
    );
    const [showKey, setShowKey] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setInputKey(geminiApiKey);
        setSelectedModel(
            EVALUATOR_MODELS.some((model) => model.id === evaluatorModel)
                ? evaluatorModel
                : EVALUATOR_MODELS[0].id
        );
    }, [evaluatorModel, geminiApiKey]);

    const handleSave = useCallback(() => {
        setGeminiApiKey(inputKey);
        setEvaluatorModel(selectedModel);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2000);
    }, [inputKey, selectedModel, setEvaluatorModel, setGeminiApiKey]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                event.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave]);

    const activeModelInfo =
        EVALUATOR_MODELS.find((model) => model.id === selectedModel) || EVALUATOR_MODELS[0];

    return (
        <section className="max-w-3xl border border-border bg-card rounded-xl p-6 space-y-8">
            <div className="space-y-4">
                <h2 className="text-title flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" /> API Keys
                </h2>
                <p className="text-body text-muted-foreground max-w-[75ch]">
                    Tester and Evaluator agents use Gemini. Direct Gemini targets reuse this same
                    Google AI Studio API key.
                </p>
                <div className="space-y-2">
                    <label htmlFor="gemini-api-key" className="text-label">Gemini API Key</label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                            id="gemini-api-key"
                            type={showKey ? 'text' : 'password'}
                            value={inputKey}
                            onChange={(event) => setInputKey(event.target.value)}
                            placeholder="AIzaSy..."
                            className="font-mono bg-background"
                        />
                        <Button
                            variant="outline"
                            onClick={() => setShowKey((current) => !current)}
                            className="gap-2 sm:w-28"
                            aria-label={showKey ? 'Hide Gemini API key' : 'Show Gemini API key'}
                        >
                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {showKey ? 'Hide' : 'Show'}
                        </Button>
                    </div>
                    <p className="text-label text-muted-foreground">
                        Stored encrypted in AgentEval settings on this machine.
                    </p>
                </div>
            </div>

            <div className="pt-6 border-t border-border space-y-4">
                <h2 className="text-title flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-primary" /> Evaluator Agent
                </h2>
                <p className="text-body text-muted-foreground max-w-[75ch]">
                    Choose the model used to grade transcripts and generate prompt improvements.
                </p>
                <div className="space-y-2">
                    <label htmlFor="evaluation-model" className="text-label">Evaluation Model</label>
                    <select
                        id="evaluation-model"
                        value={selectedModel}
                        onChange={(event) => setSelectedModel(event.target.value)}
                        className="w-full bg-background border border-border/80 rounded-lg p-2.5 text-body text-white cursor-pointer"
                    >
                        {EVALUATOR_MODELS.map((model) => (
                            <option key={model.id} value={model.id}>{model.name}</option>
                        ))}
                    </select>
                </div>

                <div className="border border-border/60 bg-background/45 p-5 rounded-lg space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-body text-white font-bold">{activeModelInfo.name}</h3>
                        {!activeModelInfo.isFreeTier && (
                            <span className="text-label px-2 py-1 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                Paid tier only
                            </span>
                        )}
                    </div>
                    <p className="text-body text-muted-foreground max-w-[70ch]">
                        {activeModelInfo.description}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/40">
                        <div className="space-y-1.5">
                            <span className="text-label text-muted-foreground">Paid pricing per 1M tokens</span>
                            <div className="font-mono text-xs tabular-nums text-white space-y-1">
                                <div>Input: <strong>{activeModelInfo.inputCostPaid} USD</strong></div>
                                <div>Output: <strong>{activeModelInfo.outputCostPaid} USD</strong></div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <span className="text-label text-muted-foreground">Free tier</span>
                            {activeModelInfo.isFreeTier ? (
                                <div className="font-mono text-xs tabular-nums text-emerald-300 space-y-1">
                                    <div>RPM: <strong>{activeModelInfo.rpmLimitFree}</strong></div>
                                    <div>RPD: <strong>{activeModelInfo.rpdLimitFree?.toLocaleString()}</strong></div>
                                    <div>TPM: <strong>{activeModelInfo.tpmLimitFree?.toLocaleString()}</strong></div>
                                </div>
                            ) : (
                                <div className="text-xs text-rose-300 font-bold flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5" /> Not available
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="pt-3 border-t border-border/40 text-xs text-muted-foreground font-mono space-y-1">
                        <div>Context: <span className="text-slate-300">{activeModelInfo.contextLimit}</span></div>
                        <div>Release: <span className="text-slate-300">{activeModelInfo.releaseDate}</span></div>
                        <div>Pricing and limits follow Google AI Studio terms.</div>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center gap-4">
                <Button onClick={handleSave}>Save Settings</Button>
                {saved && <span role="status" className="text-body text-emerald-400">Saved successfully</span>}
            </div>
        </section>
    );
};
