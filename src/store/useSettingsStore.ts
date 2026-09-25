import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fileStorage } from '../utils/fileStorage';
import { encryptApiKey, decryptApiKey } from '../utils/crypto';

import { GeminiModelInfo, GEMINI_MODELS } from '../config/geminiModels';
import { fetchAvailableGeminiModels } from '../services/geminiClient';
import { AiProvider, LiteLlmModelInfo } from '../types';
import {
    DEFAULT_LITELLM_BASE_URL,
    fetchAvailableLiteLlmModels,
    normalizeLiteLlmBaseUrl,
} from '../services/litellmClient';

interface SettingsState {
    aiProvider: AiProvider;
    setAiProvider: (provider: AiProvider) => void;

    // Gemini settings
    geminiApiKey: string;
    setGeminiApiKey: (key: string) => void;
    evaluatorModel: string;
    setEvaluatorModel: (model: string) => void;
    missionGeneratorModel: string;
    setMissionGeneratorModel: (model: string) => void;
    discoveredModels: GeminiModelInfo[];
    setDiscoveredModels: (models: GeminiModelInfo[]) => void;
    refreshDiscoveredModels: (
        apiKey?: string,
        signal?: AbortSignal
    ) => Promise<{
        newCount: number;
        totalCount: number;
        models: GeminiModelInfo[];
    }>;

    // LiteLLM settings
    litellmBaseUrl: string;
    setLitellmBaseUrl: (url: string) => void;
    litellmApiKey: string;
    setLitellmApiKey: (key: string) => void;
    litellmEvaluatorModel: string;
    setLitellmEvaluatorModel: (model: string) => void;
    litellmTesterModel: string;
    setLitellmTesterModel: (model: string) => void;
    litellmMissionGeneratorModel: string;
    setLitellmMissionGeneratorModel: (model: string) => void;
    discoveredLiteLlmModels: LiteLlmModelInfo[];
    setDiscoveredLiteLlmModels: (models: LiteLlmModelInfo[]) => void;
    refreshLiteLlmModels: (
        baseUrlOverride?: string,
        apiKeyOverride?: string,
        signal?: AbortSignal
    ) => Promise<{
        newCount: number;
        totalCount: number;
        models: LiteLlmModelInfo[];
    }>;

    // General settings
    evaluationLanguage: string;
    setEvaluationLanguage: (lang: string) => void;

    // Sync settings
    syncWorkerUrl: string;
    setSyncWorkerUrl: (url: string) => void;

    // Helper utilities
    hasActiveApiKey: () => boolean;
    getActiveApiKey: () => string;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            aiProvider: 'gemini',
            setAiProvider: (provider) => set({ aiProvider: provider }),

            // Gemini defaults
            geminiApiKey: '',
            setGeminiApiKey: (key) => set({ geminiApiKey: key }),
            evaluatorModel: 'gemini-3.5-flash-lite',
            setEvaluatorModel: (model) => set({ evaluatorModel: model }),
            missionGeneratorModel: 'gemini-3.7-flash',
            setMissionGeneratorModel: (model) => set({ missionGeneratorModel: model }),
            discoveredModels: [],
            setDiscoveredModels: (models) => set({ discoveredModels: models }),
            refreshDiscoveredModels: async (
                apiKeyOverride?: string,
                signal?: AbortSignal
            ) => {
                const key = apiKeyOverride?.trim() || get().geminiApiKey?.trim();
                if (!key) {
                    throw new Error('API Key is required to fetch available Gemini models.');
                }
                const fetchedModels = await fetchAvailableGeminiModels(key, signal);
                const currentDiscovered = get().discoveredModels || [];
                const staticIds = new Set(GEMINI_MODELS.map((m) => m.id));
                const prevKnownIds = new Set([
                    ...staticIds,
                    ...currentDiscovered.map((m) => m.id),
                ]);

                let newCount = 0;
                for (const model of fetchedModels) {
                    if (!prevKnownIds.has(model.id)) {
                        newCount += 1;
                    }
                }

                set({ discoveredModels: fetchedModels });

                return {
                    newCount,
                    totalCount: fetchedModels.length,
                    models: fetchedModels,
                };
            },

            // LiteLLM defaults
            litellmBaseUrl: DEFAULT_LITELLM_BASE_URL,
            setLitellmBaseUrl: (url) => set({ litellmBaseUrl: normalizeLiteLlmBaseUrl(url) }),
            litellmApiKey: '',
            setLitellmApiKey: (key) => set({ litellmApiKey: key }),
            litellmEvaluatorModel: 'gpt-4o-mini',
            setLitellmEvaluatorModel: (model) => set({ litellmEvaluatorModel: model }),
            litellmTesterModel: 'gpt-4o-mini',
            setLitellmTesterModel: (model) => set({ litellmTesterModel: model }),
            litellmMissionGeneratorModel: 'gpt-4o-mini',
            setLitellmMissionGeneratorModel: (model) => set({ litellmMissionGeneratorModel: model }),
            discoveredLiteLlmModels: [],
            setDiscoveredLiteLlmModels: (models) => set({ discoveredLiteLlmModels: models }),
            refreshLiteLlmModels: async (
                baseUrlOverride?: string,
                apiKeyOverride?: string,
                signal?: AbortSignal
            ) => {
                const baseUrl = baseUrlOverride?.trim() || get().litellmBaseUrl?.trim() || DEFAULT_LITELLM_BASE_URL;
                const apiKey = apiKeyOverride?.trim() || get().litellmApiKey?.trim();

                if (!apiKey) {
                    throw new Error('LiteLLM API Key is required to fetch available models.');
                }

                const fetchedModels = await fetchAvailableLiteLlmModels(baseUrl, apiKey, signal);
                const currentDiscovered = get().discoveredLiteLlmModels || [];
                const prevKnownIds = new Set(currentDiscovered.map((m) => m.id));

                let newCount = 0;
                for (const model of fetchedModels) {
                    if (!prevKnownIds.has(model.id)) {
                        newCount += 1;
                    }
                }

                set({ discoveredLiteLlmModels: fetchedModels });

                // If currently selected model is empty or default, pick the first discovered model
                const currentEvalModel = get().litellmEvaluatorModel;
                if ((!currentEvalModel || currentEvalModel === 'gpt-4o-mini') && fetchedModels.length > 0) {
                    const preferred = fetchedModels.find(m => m.id.includes('gpt-4o') || m.id.includes('flash')) || fetchedModels[0];
                    set({
                        litellmEvaluatorModel: preferred.id,
                        litellmTesterModel: preferred.id,
                        litellmMissionGeneratorModel: preferred.id,
                    });
                }

                return {
                    newCount,
                    totalCount: fetchedModels.length,
                    models: fetchedModels,
                };
            },

            // General
            evaluationLanguage: 'pt-BR',
            setEvaluationLanguage: (lang) => set({ evaluationLanguage: lang }),

            // Sync
            syncWorkerUrl: 'https://agenteval-sync.alexandre-23b.workers.dev',
            setSyncWorkerUrl: (url) => set({ syncWorkerUrl: url }),

            hasActiveApiKey: () => {
                const state = get();
                if (state.aiProvider === 'litellm') {
                    return Boolean(state.litellmApiKey && state.litellmApiKey.trim().length > 0);
                }
                return Boolean(state.geminiApiKey && state.geminiApiKey.trim().length > 0);
            },

            getActiveApiKey: () => {
                const state = get();
                if (state.aiProvider === 'litellm') {
                    return state.litellmApiKey?.trim() || '';
                }
                return state.geminiApiKey?.trim() || '';
            },
        }),
        {
            name: 'agent-qa-settings',
            storage: createJSONStorage(() => ({
                getItem: async (name) => {
                    const value = await fileStorage.getItem(name);
                    if (!value) return null;
                    try {
                        const parsed = JSON.parse(value);
                        if (parsed.state) {
                            if (parsed.state.geminiApiKey) {
                                parsed.state.geminiApiKey = await decryptApiKey(parsed.state.geminiApiKey);
                            }
                            if (parsed.state.litellmApiKey) {
                                parsed.state.litellmApiKey = await decryptApiKey(parsed.state.litellmApiKey);
                            }
                        }
                        return JSON.stringify(parsed);
                    } catch (e) {
                        console.warn('[useSettingsStore] Erro ao descriptografar estado carregado:', e);
                        return value;
                    }
                },
                setItem: async (name, value) => {
                    try {
                        const parsed = JSON.parse(value);
                        if (parsed.state) {
                            if (parsed.state.geminiApiKey) {
                                parsed.state.geminiApiKey = await encryptApiKey(parsed.state.geminiApiKey);
                            }
                            if (parsed.state.litellmApiKey) {
                                parsed.state.litellmApiKey = await encryptApiKey(parsed.state.litellmApiKey);
                            }
                        }
                        await fileStorage.setItem(name, JSON.stringify(parsed));
                    } catch (e) {
                        console.warn('[useSettingsStore] Erro ao criptografar estado antes de salvar:', e);
                        await fileStorage.setItem(name, value);
                    }
                },
                removeItem: async (name) => {
                    await fileStorage.removeItem(name);
                }
            })),
            merge: (persistedState, currentState) => {
                const typedState = persistedState as Partial<SettingsState> | undefined;
                return {
                    ...currentState,
                    ...typedState,
                    aiProvider: typedState?.aiProvider || currentState.aiProvider,
                    geminiApiKey: typedState?.geminiApiKey || currentState.geminiApiKey,
                    evaluatorModel: typedState?.evaluatorModel || currentState.evaluatorModel,
                    missionGeneratorModel: typedState?.missionGeneratorModel || currentState.missionGeneratorModel,
                    evaluationLanguage: typedState?.evaluationLanguage || currentState.evaluationLanguage,
                    discoveredModels: typedState?.discoveredModels?.length
                        ? typedState.discoveredModels
                        : currentState.discoveredModels,
                    litellmBaseUrl: typedState?.litellmBaseUrl || currentState.litellmBaseUrl,
                    litellmApiKey: typedState?.litellmApiKey || currentState.litellmApiKey,
                    litellmEvaluatorModel: typedState?.litellmEvaluatorModel || currentState.litellmEvaluatorModel,
                    litellmTesterModel: typedState?.litellmTesterModel || currentState.litellmTesterModel,
                    litellmMissionGeneratorModel: typedState?.litellmMissionGeneratorModel || currentState.litellmMissionGeneratorModel,
                    discoveredLiteLlmModels: typedState?.discoveredLiteLlmModels?.length
                        ? typedState.discoveredLiteLlmModels
                        : currentState.discoveredLiteLlmModels,
                    syncWorkerUrl: typedState?.syncWorkerUrl !== undefined
                        ? typedState.syncWorkerUrl
                        : currentState.syncWorkerUrl,
                };
            },
        }
    )
);
