import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fileStorage } from '../utils/fileStorage';
import { encryptApiKey, decryptApiKey } from '../utils/crypto';

import { GeminiModelInfo, GEMINI_MODELS } from '../config/geminiModels';
import { fetchAvailableGeminiModels } from '../services/geminiClient';

interface SettingsState {
    geminiApiKey: string;
    setGeminiApiKey: (key: string) => void;
    evaluatorModel: string;
    setEvaluatorModel: (model: string) => void;
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
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            geminiApiKey: '',
            setGeminiApiKey: (key) => set({ geminiApiKey: key }),
            evaluatorModel: 'gemini-3.5-flash-lite',
            setEvaluatorModel: (model) => set({ evaluatorModel: model }),
            discoveredModels: [],
            setDiscoveredModels: (models) => set({ discoveredModels: models }),
            refreshDiscoveredModels: async (
                apiKeyOverride?: string,
                signal?: AbortSignal
            ) => {
                const key = apiKeyOverride?.trim() || get().geminiApiKey?.trim();
                if (!key) {
                    throw new Error('API Key is required to fetch available models.');
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

                // Keep fetched models in store
                set({ discoveredModels: fetchedModels });

                return {
                    newCount,
                    totalCount: fetchedModels.length,
                    models: fetchedModels,
                };
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
                        if (parsed.state && parsed.state.geminiApiKey) {
                            parsed.state.geminiApiKey = await decryptApiKey(parsed.state.geminiApiKey);
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
                        if (parsed.state && parsed.state.geminiApiKey) {
                            parsed.state.geminiApiKey = await encryptApiKey(parsed.state.geminiApiKey);
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
                    // Preserve API key and discovered models from persisted state
                    geminiApiKey: typedState?.geminiApiKey || currentState.geminiApiKey,
                    evaluatorModel: typedState?.evaluatorModel || currentState.evaluatorModel,
                    discoveredModels: typedState?.discoveredModels?.length
                        ? typedState.discoveredModels
                        : currentState.discoveredModels,
                };
            },
        }
    )
);
