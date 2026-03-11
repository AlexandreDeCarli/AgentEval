import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
        }
    )
);
