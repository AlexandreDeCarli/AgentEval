import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Cpu, Eye, EyeOff, Info, Key, RefreshCw, CheckCircle2, AlertCircle, Sparkles, Globe } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getCombinedEvaluatorModels, getGeminiModelDisplayName } from '../../config/geminiModels';
import { EVALUATION_LANGUAGES, DEFAULT_EVALUATION_LANGUAGE } from '../../config/evaluationLanguages';
import { useSettingsStore } from '../../store/useSettingsStore';

export const AiConfigurationSettings: React.FC = () => {
    const {
        geminiApiKey,
        setGeminiApiKey,
        evaluatorModel,
        setEvaluatorModel,
        missionGeneratorModel,
        setMissionGeneratorModel,
        evaluationLanguage,
        setEvaluationLanguage,
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

    const [selectedMissionModel, setSelectedMissionModel] = useState(() =>
        availableEvaluatorModels.some((model) => model.id === missionGeneratorModel)
            ? missionGeneratorModel
            : 'gemini-3.7-flash'
    );

    const isStandardLang = useMemo(
        () => EVALUATION_LANGUAGES.some((l) => l.id === evaluationLanguage),
        [evaluationLanguage]
    );

    const [selectedLang, setSelectedLang] = useState<string>(() =>
        isStandardLang ? evaluationLanguage : 'custom'
    );
    const [customLang, setCustomLang] = useState<string>(() =>
        isStandardLang ? '' : evaluationLanguage
    );

    const [inspectingRole, setInspectingRole] = useState<'evaluator' | 'mission'>('evaluator');
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

    useEffect(() => {
        setSelectedMissionModel((current) => {
            if (availableEvaluatorModels.some((m) => m.id === current)) {
                return current;
            }
            if (availableEvaluatorModels.some((m) => m.id === missionGeneratorModel)) {
                return missionGeneratorModel;
            }
            return availableEvaluatorModels.find((m) => m.id === 'gemini-3.7-flash')?.id || 'gemini-3.7-flash';
        });
    }, [availableEvaluatorModels, missionGeneratorModel]);

    useEffect(() => {
        if (EVALUATION_LANGUAGES.some((l) => l.id === evaluationLanguage)) {
            setSelectedLang(evaluationLanguage);
            setCustomLang('');
        } else if (evaluationLanguage) {
            setSelectedLang('custom');
            setCustomLang(evaluationLanguage);
        } else {
            setSelectedLang(DEFAULT_EVALUATION_LANGUAGE);
            setCustomLang('');
        }
    }, [evaluationLanguage]);

    const handleSave = useCallback(() => {
        setGeminiApiKey(inputKey);
        setEvaluatorModel(selectedModel);
        setMissionGeneratorModel(selectedMissionModel);
        const resolvedLanguage =
            selectedLang === 'custom'
                ? customLang.trim() || DEFAULT_EVALUATION_LANGUAGE
                : selectedLang;
        setEvaluationLanguage(resolvedLanguage);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2000);
    }, [
        inputKey,
        selectedModel,
        selectedMissionModel,
        selectedLang,
        customLang,
        setEvaluatorModel,
        setMissionGeneratorModel,
        setEvaluationLanguage,
        setGeminiApiKey,
    ]);

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

    const activeModelId = inspectingRole === 'evaluator' ? selectedModel : selectedMissionModel;
    const activeModelInfo =
        availableEvaluatorModels.find((model) => model.id === activeModelId) ||
        availableEvaluatorModels[0] || {
            id: activeModelId,
            name: activeModelId,
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 p-4 rounded-xl border border-border/70 bg-background/40">
                        <div className="flex items-center justify-between">
                            <label htmlFor="evaluation-model" className="text-label font-bold text-white flex items-center gap-1.5">
                                <Cpu className="w-4 h-4 text-primary" /> Evaluation Model
                            </label>
                            <span className="text-xs text-muted-foreground font-mono">
                                {availableEvaluatorModels.length} na lista
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
                        <p className="text-xs text-muted-foreground">
                            Used by Evaluator agent to grade transcripts, score criteria, and suggest prompt improvements.
                        </p>
                    </div>

                    <div className="space-y-2 p-4 rounded-xl border border-border/70 bg-background/40">
                        <div className="flex items-center justify-between">
                            <label htmlFor="mission-generator-model" className="text-label font-bold text-white flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-[#8B5CF6]" /> Mission Generation Model
                            </label>
                            <span className="text-xs text-muted-foreground font-mono">
                                {availableEvaluatorModels.length} na lista
                            </span>
                        </div>
                        <select
                            id="mission-generator-model"
                            value={selectedMissionModel}
                            onChange={(event) => setSelectedMissionModel(event.target.value)}
                            className="w-full bg-background border border-border/80 rounded-lg p-2.5 text-body text-white cursor-pointer"
                        >
                            {availableEvaluatorModels.map((model) => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground">
                            Used by AI to analyze project documentation and create comprehensive test scenarios.
                        </p>
                    </div>
                </div>

                <div className="space-y-2 p-4 rounded-xl border border-border/70 bg-background/40">
                    <div className="flex items-center justify-between">
                        <label htmlFor="evaluation-language" className="text-label font-bold text-white flex items-center gap-1.5">
                            <Globe className="w-4 h-4 text-emerald-400" /> Evaluation Report Language
                        </label>
                        <span className="text-xs text-muted-foreground font-mono">
                            {selectedLang === 'custom'
                                ? customLang.trim() || 'Custom'
                                : EVALUATION_LANGUAGES.find((l) => l.id === selectedLang)?.nativeName || selectedLang}
                        </span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <select
                            id="evaluation-language"
                            value={selectedLang}
                            onChange={(event) => setSelectedLang(event.target.value)}
                            className="w-full bg-background border border-border/80 rounded-lg p-2.5 text-body text-white cursor-pointer"
                        >
                            {EVALUATION_LANGUAGES.map((lang) => (
                                <option key={lang.id} value={lang.id}>
                                    {lang.nativeName} ({lang.name})
                                </option>
                            ))}
                            <option value="custom">Outro idioma (Personalizado)...</option>
                        </select>
                        {selectedLang === 'custom' && (
                            <Input
                                id="custom-evaluation-language"
                                type="text"
                                value={customLang}
                                onChange={(event) => setCustomLang(event.target.value)}
                                placeholder="Ex: Italiano, Japonês, pt-PT..."
                                className="sm:max-w-xs bg-background"
                            />
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Define a linguagem obrigatória injetada no prompt do Avaliador para resumos, notas de critérios e sugestões de melhoria (mesmo em conversas com prompts em inglês).
                    </p>
                </div>

                <div className="border border-border/60 bg-background/45 p-5 rounded-lg space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Inspect Model Specs:
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setInspectingRole('evaluator')}
                                className={`text-xs px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                    inspectingRole === 'evaluator'
                                        ? 'bg-primary text-white font-bold shadow-sm'
                                        : 'bg-background border border-border text-muted-foreground hover:text-white'
                                }`}
                            >
                                Evaluator ({getGeminiModelDisplayName(selectedModel, discoveredModels)})
                            </button>
                            <button
                                type="button"
                                onClick={() => setInspectingRole('mission')}
                                className={`text-xs px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                    inspectingRole === 'mission'
                                        ? 'bg-[#8B5CF6] text-white font-bold shadow-sm'
                                        : 'bg-background border border-border text-muted-foreground hover:text-white'
                                }`}
                            >
                                Mission Gen ({getGeminiModelDisplayName(selectedMissionModel, discoveredModels)})
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-start justify-between gap-2 pt-1">
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

