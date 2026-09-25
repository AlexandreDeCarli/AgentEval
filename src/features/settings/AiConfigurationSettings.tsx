import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Cpu,
    Eye,
    EyeOff,
    Info,
    Key,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    Globe,
    Server,
    RotateCcw,
    Bot,
    Scale,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getCombinedEvaluatorModels, getGeminiModelDisplayName } from '../../config/geminiModels';
import { EVALUATION_LANGUAGES, DEFAULT_EVALUATION_LANGUAGE } from '../../config/evaluationLanguages';
import { useSettingsStore } from '../../store/useSettingsStore';
import { AiProvider } from '../../types';
import { DEFAULT_LITELLM_BASE_URL } from '../../services/litellmClient';

export const AiConfigurationSettings: React.FC = () => {
    const {
        aiProvider,
        setAiProvider,
        geminiApiKey,
        setGeminiApiKey,
        evaluatorModel,
        setEvaluatorModel,
        missionGeneratorModel,
        setMissionGeneratorModel,
        discoveredModels,
        refreshDiscoveredModels,
        litellmBaseUrl,
        setLitellmBaseUrl,
        litellmApiKey,
        setLitellmApiKey,
        litellmEvaluatorModel,
        setLitellmEvaluatorModel,
        litellmTesterModel,
        setLitellmTesterModel,
        litellmMissionGeneratorModel,
        setLitellmMissionGeneratorModel,
        discoveredLiteLlmModels,
        refreshLiteLlmModels,
        evaluationLanguage,
        setEvaluationLanguage,
    } = useSettingsStore();

    // Provider state
    const [selectedProvider, setSelectedProvider] = useState<AiProvider>(aiProvider || 'gemini');

    // Gemini local state
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

    const [inspectingRole, setInspectingRole] = useState<'evaluator' | 'mission'>('evaluator');
    const [showKey, setShowKey] = useState(false);
    const [isRefreshingModels, setIsRefreshingModels] = useState(false);
    const [refreshStatus, setRefreshStatus] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    // LiteLLM local state
    const [inputLitellmBaseUrl, setInputLitellmBaseUrl] = useState(litellmBaseUrl || DEFAULT_LITELLM_BASE_URL);
    const [inputLitellmKey, setInputLitellmKey] = useState(litellmApiKey || '');
    const [showLitellmKey, setShowLitellmKey] = useState(false);
    const [selectedLitellmEvalModel, setSelectedLitellmEvalModel] = useState(litellmEvaluatorModel || 'gpt-4o-mini');
    const [selectedLitellmMissionModel, setSelectedLitellmMissionModel] = useState(litellmMissionGeneratorModel || 'gpt-4o-mini');
    const [selectedLitellmTesterModel, setSelectedLitellmTesterModel] = useState(litellmTesterModel || 'gpt-4o-mini');
    const [isRefreshingLiteLlm, setIsRefreshingLiteLlm] = useState(false);
    const [refreshLiteLlmStatus, setRefreshLiteLlmStatus] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    // Evaluation Language local state
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

    const [saved, setSaved] = useState(false);

    // Sync from store
    useEffect(() => {
        setSelectedProvider(aiProvider || 'gemini');
    }, [aiProvider]);

    useEffect(() => {
        setInputKey(geminiApiKey);
    }, [geminiApiKey]);

    useEffect(() => {
        setInputLitellmBaseUrl(litellmBaseUrl || DEFAULT_LITELLM_BASE_URL);
    }, [litellmBaseUrl]);

    useEffect(() => {
        setInputLitellmKey(litellmApiKey);
    }, [litellmApiKey]);

    useEffect(() => {
        setSelectedLitellmEvalModel(litellmEvaluatorModel || 'gpt-4o-mini');
        setSelectedLitellmMissionModel(litellmMissionGeneratorModel || 'gpt-4o-mini');
        setSelectedLitellmTesterModel(litellmTesterModel || 'gpt-4o-mini');
    }, [litellmEvaluatorModel, litellmMissionGeneratorModel, litellmTesterModel]);

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
        setAiProvider(selectedProvider);

        // Save Gemini settings
        setGeminiApiKey(inputKey);
        setEvaluatorModel(selectedModel);
        setMissionGeneratorModel(selectedMissionModel);

        // Save LiteLLM settings
        setLitellmBaseUrl(inputLitellmBaseUrl.trim() || DEFAULT_LITELLM_BASE_URL);
        setLitellmApiKey(inputLitellmKey.trim());
        setLitellmEvaluatorModel(selectedLitellmEvalModel.trim() || 'gpt-4o-mini');
        setLitellmMissionGeneratorModel(selectedLitellmMissionModel.trim() || 'gpt-4o-mini');
        setLitellmTesterModel(selectedLitellmTesterModel.trim() || 'gpt-4o-mini');

        // Save language
        const resolvedLanguage =
            selectedLang === 'custom'
                ? customLang.trim() || DEFAULT_EVALUATION_LANGUAGE
                : selectedLang;
        setEvaluationLanguage(resolvedLanguage);

        setSaved(true);
        window.setTimeout(() => setSaved(false), 2000);
    }, [
        selectedProvider,
        inputKey,
        selectedModel,
        selectedMissionModel,
        inputLitellmBaseUrl,
        inputLitellmKey,
        selectedLitellmEvalModel,
        selectedLitellmMissionModel,
        selectedLitellmTesterModel,
        selectedLang,
        customLang,
        setAiProvider,
        setGeminiApiKey,
        setEvaluatorModel,
        setMissionGeneratorModel,
        setLitellmBaseUrl,
        setLitellmApiKey,
        setLitellmEvaluatorModel,
        setLitellmMissionGeneratorModel,
        setLitellmTesterModel,
        setEvaluationLanguage,
    ]);

    const handleRefreshGeminiModels = async () => {
        const keyToUse = inputKey.trim() || geminiApiKey.trim();
        if (!keyToUse) {
            setRefreshStatus({
                type: 'error',
                message: 'Enter and save a Gemini API key to check for new models.',
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
                    message: `${result.newCount} new model(s) discovered and added to the catalog! (${result.totalCount} models available)`,
                });
            } else {
                setRefreshStatus({
                    type: 'success',
                    message: `All models are up to date. (${result.totalCount} models available in Google AI)`,
                });
            }
        } catch (error) {
            setRefreshStatus({
                type: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to fetch models from Gemini API.',
            });
        } finally {
            setIsRefreshingModels(false);
            window.setTimeout(() => setRefreshStatus(null), 5000);
        }
    };

    const handleRefreshLiteLlmModels = async () => {
        const urlToUse = inputLitellmBaseUrl.trim() || litellmBaseUrl || DEFAULT_LITELLM_BASE_URL;
        const keyToUse = inputLitellmKey.trim() || litellmApiKey.trim();

        if (!keyToUse) {
            setRefreshLiteLlmStatus({
                type: 'error',
                message: 'Enter and save your LiteLLM API Key before checking models.',
            });
            window.setTimeout(() => setRefreshLiteLlmStatus(null), 4000);
            return;
        }

        setIsRefreshingLiteLlm(true);
        setRefreshLiteLlmStatus(null);

        try {
            const result = await refreshLiteLlmModels(urlToUse, keyToUse);
            setRefreshLiteLlmStatus({
                type: 'success',
                message: `Connection successful! ${result.totalCount} model(s) found in LiteLLM proxy.`,
            });
            if (result.models.length > 0) {
                const first = result.models[0].id;
                if (!selectedLitellmEvalModel || selectedLitellmEvalModel === 'gpt-4o-mini') {
                    setSelectedLitellmEvalModel(first);
                    setSelectedLitellmMissionModel(first);
                    setSelectedLitellmTesterModel(first);
                }
            }
        } catch (error) {
            setRefreshLiteLlmStatus({
                type: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to connect to LiteLLM.',
            });
        } finally {
            setIsRefreshingLiteLlm(false);
            window.setTimeout(() => setRefreshLiteLlmStatus(null), 6000);
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
            {/* Header and Provider Switcher */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
                    <div>
                        <h2 className="text-title text-white flex items-center gap-2">
                            <Bot className="w-5 h-5 text-primary" /> Provedor de IA (AI Provider)
                        </h2>
                        <p className="text-body text-muted-foreground mt-1">
                            Selecione qual provedor LLM gerenciará os agentes internos (Tester, Avaliador e Gerador de Cenários).
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 bg-background rounded-lg border border-border/70 shrink-0">
                        <button
                            type="button"
                            onClick={() => setSelectedProvider('gemini')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                                selectedProvider === 'gemini'
                                    ? 'bg-primary text-white shadow-sm font-semibold'
                                    : 'text-muted-foreground hover:text-white'
                            }`}
                        >
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            Google Gemini
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedProvider('litellm')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                                selectedProvider === 'litellm'
                                    ? 'bg-primary text-white shadow-sm font-semibold'
                                    : 'text-muted-foreground hover:text-white'
                            }`}
                        >
                            <Server className="w-4 h-4 text-purple-400" />
                            LiteLLM (Proxy)
                        </button>
                    </div>
                </div>

                {/* Banner indicating active provider */}
                <div className="p-3 rounded-lg border bg-muted/20 border-border/60 flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Provedor ativo no momento:{' '}
                        <strong className="text-white">
                            {selectedProvider === 'litellm' ? 'LiteLLM Proxy (OpenAI-compatible)' : 'Google AI Studio (Gemini)'}
                        </strong>
                    </span>
                    <span className="text-muted-foreground font-mono">
                        {selectedProvider === 'litellm' ? 'https://llm.potencial.tec.br' : 'generativelanguage.googleapis.com'}
                    </span>
                </div>
            </div>

            {/* LITELLM CONFIGURATION SECTION */}
            {selectedProvider === 'litellm' && (
                <div className="space-y-6 pt-2">
                    <div className="space-y-4">
                        <h2 className="text-title flex items-center gap-2 text-white">
                            <Server className="w-5 h-5 text-purple-400" /> LiteLLM Proxy Configuration
                        </h2>
                        <p className="text-body text-muted-foreground max-w-[75ch]">
                            Connect to an OpenAI-compatible LiteLLM endpoint at{' '}
                            <code className="text-primary font-mono text-xs bg-muted/40 px-1 py-0.5 rounded">
                                https://llm.potencial.tec.br
                            </code>.
                        </p>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="litellm-base-url" className="text-label text-slate-300">
                                    LiteLLM Endpoint Base URL
                                </label>
                                {inputLitellmBaseUrl !== DEFAULT_LITELLM_BASE_URL && (
                                    <button
                                        type="button"
                                        onClick={() => setInputLitellmBaseUrl(DEFAULT_LITELLM_BASE_URL)}
                                        className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Reset to default
                                    </button>
                                )}
                            </div>
                            <Input
                                id="litellm-base-url"
                                type="text"
                                value={inputLitellmBaseUrl}
                                onChange={(event) => setInputLitellmBaseUrl(event.target.value)}
                                placeholder="https://llm.potencial.tec.br"
                                className="font-mono bg-background"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="litellm-api-key" className="text-label text-slate-300">
                                LiteLLM API Key (Bearer Token)
                            </label>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Input
                                    id="litellm-api-key"
                                    type={showLitellmKey ? 'text' : 'password'}
                                    value={inputLitellmKey}
                                    onChange={(event) => setInputLitellmKey(event.target.value)}
                                    placeholder="sk-..."
                                    className="font-mono bg-background"
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => setShowLitellmKey((current) => !current)}
                                    className="gap-2 sm:w-28"
                                    aria-label={showLitellmKey ? 'Hide LiteLLM API key' : 'Show LiteLLM API key'}
                                >
                                    {showLitellmKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    {showLitellmKey ? 'Hide' : 'Show'}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Stored encrypted locally in AgentEval settings.
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h3 className="text-body font-bold text-white flex items-center gap-2">
                                    <Cpu className="w-4 h-4 text-purple-400" /> LiteLLM Models
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Discover available models on your instance or specify custom model names directly.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefreshLiteLlmModels}
                                disabled={isRefreshingLiteLlm}
                                className="gap-2 shrink-0 border-purple-500/40 hover:border-purple-400 text-slate-200"
                            >
                                <RefreshCw className={`w-4 h-4 text-purple-400 ${isRefreshingLiteLlm ? 'animate-spin' : ''}`} />
                                {isRefreshingLiteLlm ? 'Checking...' : 'Check Connection & Models'}
                            </Button>
                        </div>

                        {refreshLiteLlmStatus && (
                            <div
                                className={`p-3 rounded-lg flex items-center gap-2.5 text-body border transition-all ${
                                    refreshLiteLlmStatus.type === 'success'
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                }`}
                                role="alert"
                            >
                                {refreshLiteLlmStatus.type === 'success' ? (
                                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                                )}
                                <span>{refreshLiteLlmStatus.message}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Evaluator Agent Model */}
                            <div className="space-y-2 p-4 rounded-xl border border-border/70 bg-background/40">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="litellm-eval-model" className="text-label font-bold text-white flex items-center gap-1.5">
                                        <Scale className="w-4 h-4 text-purple-400" /> Evaluator Model
                                    </label>
                                </div>
                                {discoveredLiteLlmModels.length > 0 ? (
                                    <select
                                        id="litellm-eval-model"
                                        value={selectedLitellmEvalModel}
                                        onChange={(e) => setSelectedLitellmEvalModel(e.target.value)}
                                        className="w-full bg-background border border-border/80 rounded-lg p-2.5 text-body text-white cursor-pointer font-mono"
                                    >
                                        {!discoveredLiteLlmModels.some(m => m.id === selectedLitellmEvalModel) && selectedLitellmEvalModel && (
                                            <option value={selectedLitellmEvalModel}>{selectedLitellmEvalModel} (Custom)</option>
                                        )}
                                        {discoveredLiteLlmModels.map((m) => (
                                            <option key={m.id} value={m.id}>{m.id}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <Input
                                        id="litellm-eval-model"
                                        value={selectedLitellmEvalModel}
                                        onChange={(e) => setSelectedLitellmEvalModel(e.target.value)}
                                        placeholder="gpt-4o-mini"
                                        className="font-mono bg-background"
                                    />
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Evaluates test transcripts and generates quality scores and recommendations.
                                </p>
                            </div>

                            {/* Tester Agent Model */}
                            <div className="space-y-2 p-4 rounded-xl border border-border/70 bg-background/40">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="litellm-tester-model" className="text-label font-bold text-white flex items-center gap-1.5">
                                        <Bot className="w-4 h-4 text-primary" /> Tester Agent Model
                                    </label>
                                </div>
                                {discoveredLiteLlmModels.length > 0 ? (
                                    <select
                                        id="litellm-tester-model"
                                        value={selectedLitellmTesterModel}
                                        onChange={(e) => setSelectedLitellmTesterModel(e.target.value)}
                                        className="w-full bg-background border border-border/80 rounded-lg p-2.5 text-body text-white cursor-pointer font-mono"
                                    >
                                        {!discoveredLiteLlmModels.some(m => m.id === selectedLitellmTesterModel) && selectedLitellmTesterModel && (
                                            <option value={selectedLitellmTesterModel}>{selectedLitellmTesterModel} (Custom)</option>
                                        )}
                                        {discoveredLiteLlmModels.map((m) => (
                                            <option key={m.id} value={m.id}>{m.id}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <Input
                                        id="litellm-tester-model"
                                        value={selectedLitellmTesterModel}
                                        onChange={(e) => setSelectedLitellmTesterModel(e.target.value)}
                                        placeholder="gpt-4o-mini"
                                        className="font-mono bg-background"
                                    />
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Generates tester persona responses simulating the end user.
                                </p>
                            </div>

                            {/* Mission Generator Model */}
                            <div className="space-y-2 p-4 rounded-xl border border-border/70 bg-background/40">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="litellm-mission-model" className="text-label font-bold text-white flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-[#8B5CF6]" /> Mission Gen Model
                                    </label>
                                </div>
                                {discoveredLiteLlmModels.length > 0 ? (
                                    <select
                                        id="litellm-mission-model"
                                        value={selectedLitellmMissionModel}
                                        onChange={(e) => setSelectedLitellmMissionModel(e.target.value)}
                                        className="w-full bg-background border border-border/80 rounded-lg p-2.5 text-body text-white cursor-pointer font-mono"
                                    >
                                        {!discoveredLiteLlmModels.some(m => m.id === selectedLitellmMissionModel) && selectedLitellmMissionModel && (
                                            <option value={selectedLitellmMissionModel}>{selectedLitellmMissionModel} (Custom)</option>
                                        )}
                                        {discoveredLiteLlmModels.map((m) => (
                                            <option key={m.id} value={m.id}>{m.id}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <Input
                                        id="litellm-mission-model"
                                        value={selectedLitellmMissionModel}
                                        onChange={(e) => setSelectedLitellmMissionModel(e.target.value)}
                                        placeholder="gpt-4o-mini"
                                        className="font-mono bg-background"
                                    />
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Automatically drafts test mission scenarios from project documentation.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* GOOGLE GEMINI CONFIGURATION SECTION */}
            {selectedProvider === 'gemini' && (
                <div className="space-y-8 pt-2">
                    <div className="space-y-4">
                        <h2 className="text-title flex items-center gap-2 text-white">
                            <Key className="w-5 h-5 text-primary" /> Google AI Studio API Key
                        </h2>
                        <p className="text-body text-muted-foreground max-w-[75ch]">
                            Direct API key from Google AI Studio for Tester, Evaluator, and Target Gemini models.
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
                                Stored encrypted locally in AgentEval settings.
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
                                    Select the Gemini model used to evaluate transcripts and suggest prompt improvements.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefreshGeminiModels}
                                disabled={isRefreshingModels}
                                className="gap-2 shrink-0 border-primary/40 hover:border-primary text-slate-200"
                                title="Query the Google Gemini API to check for newly available models"
                            >
                                <RefreshCw className={`w-4 h-4 text-primary ${isRefreshingModels ? 'animate-spin' : ''}`} />
                                {isRefreshingModels ? 'Checking...' : 'Check New Models'}
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
                                        {availableEvaluatorModels.length} in catalog
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
                                    Used by the evaluator agent to score runs and compute quality metrics.
                                </p>
                            </div>

                            <div className="space-y-2 p-4 rounded-xl border border-border/70 bg-background/40">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="mission-generator-model" className="text-label font-bold text-white flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-[#8B5CF6]" /> Mission Generation Model
                                    </label>
                                    <span className="text-xs text-muted-foreground font-mono">
                                        {availableEvaluatorModels.length} in catalog
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
                                    Used to analyze documentation and propose new test missions.
                                </p>
                            </div>
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
                        </div>
                    </div>
                </div>
            )}

            {/* SHARED SECTION: EVALUATION LANGUAGE */}
            <div className="pt-6 border-t border-border space-y-4">
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
                            <option value="custom">Other language (Custom)...</option>
                        </select>
                        {selectedLang === 'custom' && (
                            <Input
                                id="custom-evaluation-language"
                                type="text"
                                value={customLang}
                                onChange={(event) => setCustomLang(event.target.value)}
                                placeholder="e.g. Italian, Japanese, pt-PT..."
                                className="sm:max-w-xs bg-background"
                            />
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Defines the required language for the evaluation report (summaries, criteria, and prompt improvements), regardless of the provider used.
                    </p>
                </div>
            </div>

            {/* SAVE BUTTON */}
            <div className="pt-4 border-t border-border flex items-center gap-4">
                <Button onClick={handleSave}>Save Settings</Button>
                {saved && <span role="status" className="text-body text-emerald-400">Settings saved successfully!</span>}
            </div>
        </section>
    );
};
