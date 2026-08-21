import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Cpu, Eye, EyeOff, Info, Key, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getCombinedEvaluatorModels } from '../../config/geminiModels';
import { useSettingsStore } from '../../store/useSettingsStore';

export const AiConfigurationSettings: React.FC = () => {
    const {
        geminiApiKey,
        setGeminiApiKey,
        evaluatorModel,
        setEvaluatorModel,
        discoveredModels,
        refreshDiscoveredModels,
    } = useSettingsStore();

    const [inputKey, setInputKey] = useState(geminiApiKey);
    const availableEvaluatorModels = useMemo(
        () => getCombinedEvaluatorModels(discoveredModels),
        [discoveredModels]
    );

    const [selectedModel, setSelectedModel] = useState(() =>
        availableEvaluatorModels.some((model) => model.id === evaluatorModel)
            ? evaluatorModel
            : availableEvaluatorModels[0]?.id || 'gemini-3.5-flash-lite'
    );
    const [showKey, setShowKey] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isRefreshingModels, setIsRefreshingModels] = useState(false);
    const [refreshStatus, setRefreshStatus] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    useEffect(() => {
        setInputKey(geminiApiKey);
    }, [geminiApiKey]);

    useEffect(() => {
        setSelectedModel((current) => {
            if (availableEvaluatorModels.some((m) => m.id === current)) {
                return current;
            }
            if (availableEvaluatorModels.some((m) => m.id === evaluatorModel)) {
                return evaluatorModel;
            }
            return availableEvaluatorModels[0]?.id || evaluatorModel;
        });
    }, [availableEvaluatorModels, evaluatorModel]);

    const handleSave = useCallback(() => {
        setGeminiApiKey(inputKey);
        setEvaluatorModel(selectedModel);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2000);
    }, [inputKey, selectedModel, setEvaluatorModel, setGeminiApiKey]);

    const handleRefreshModels = async () => {
        const keyToUse = inputKey.trim() || geminiApiKey.trim();
        if (!keyToUse) {
            setRefreshStatus({
                type: 'error',
                message: 'Informe e salve uma chave de API Gemini para verificar novos modelos.',
            });
            window.setTimeout(() => setRefreshStatus(null), 4000);
            return;
        }

        setIsRefreshingModels(true);
        setRefreshStatus(null);

        try {
            const result = await refreshDiscoveredModels(keyToUse);
            if (result.newCount > 0) {
                setRefreshStatus({
                    type: 'success',
                    message: `${result.newCount} novo(s) modelo(s) encontrado(s) e adicionado(s) à lista! (${result.totalCount} modelos disponíveis)`,
                });
            } else {
                setRefreshStatus({
                    type: 'success',
                    message: `Todos os modelos estão atualizados. (${result.totalCount} modelos disponíveis no Google AI)`,
                });
            }
        } catch (error) {
            setRefreshStatus({
                type: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Falha ao buscar modelos na API do Gemini.',
            });
        } finally {
            setIsRefreshingModels(false);
            window.setTimeout(() => setRefreshStatus(null), 5000);
        }
    };

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
        availableEvaluatorModels.find((model) => model.id === selectedModel) ||
        availableEvaluatorModels[0] || {
            id: selectedModel,
            name: selectedModel,
            isFreeTier: true,
            inputCostPaid: 'Custom',
            outputCostPaid: 'Custom',
            description: 'Custom Gemini model',
            contextLimit: '1M tokens',
            standardRate: { inputPerMillionUsd: 0, outputPerMillionUsd: 0 },
        };

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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="text-title flex items-center gap-2">
                            <Cpu className="w-5 h-5 text-primary" /> Evaluator Agent & Model Catalog
                        </h2>
                        <p className="text-body text-muted-foreground max-w-[75ch]">
                            Choose the model used to grade transcripts and generate prompt improvements.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshModels}
                        disabled={isRefreshingModels}
                        className="gap-2 shrink-0 border-primary/40 hover:border-primary text-slate-200"
                        title="Consultar a API do Google Gemini para verificar novos modelos disponíveis"
                    >
                        <RefreshCw className={`w-4 h-4 text-primary ${isRefreshingModels ? 'animate-spin' : ''}`} />
                        {isRefreshingModels ? 'Verificando...' : 'Verificar Novos Modelos'}
                    </Button>
                </div>

                {refreshStatus && (
                    <div
                        className={`p-3 rounded-lg flex items-center gap-2.5 text-body border transition-all ${
                            refreshStatus.type === 'success'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                        role="alert"
                    >
                        {refreshStatus.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        ) : (
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        )}
                        <span>{refreshStatus.message}</span>
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label htmlFor="evaluation-model" className="text-label">Evaluation Model</label>
                        <span className="text-xs text-muted-foreground font-mono">
                            {availableEvaluatorModels.length} modelos na lista
                        </span>
                    </div>
                    <select
                        id="evaluation-model"
                        value={selectedModel}
                        onChange={(event) => setSelectedModel(event.target.value)}
                        className="w-full bg-background border border-border/80 rounded-lg p-2.5 text-body text-white cursor-pointer"
                    >
                        {availableEvaluatorModels.map((model) => (
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
                                    <div>RPM: <strong>{activeModelInfo.rpmLimitFree ?? 'Standard'}</strong></div>
                                    <div>RPD: <strong>{activeModelInfo.rpdLimitFree?.toLocaleString() ?? 'Standard'}</strong></div>
                                    <div>TPM: <strong>{activeModelInfo.tpmLimitFree?.toLocaleString() ?? 'Standard'}</strong></div>
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
                        {activeModelInfo.releaseDate && (
                            <div>Release: <span className="text-slate-300">{activeModelInfo.releaseDate}</span></div>
                        )}
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

