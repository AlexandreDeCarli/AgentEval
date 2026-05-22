import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fileStorage } from '../utils/fileStorage';
import { encryptApiKey, decryptApiKey } from '../utils/crypto';

interface SettingsState {
    geminiApiKey: string;
    setGeminiApiKey: (key: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            geminiApiKey: '',
            setGeminiApiKey: (key) => set({ geminiApiKey: key }),
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
        }
    )
);
