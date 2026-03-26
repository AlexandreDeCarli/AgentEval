import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fileStorage } from '../utils/fileStorage';

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
            storage: createJSONStorage(() => fileStorage),
        }
    )
);
