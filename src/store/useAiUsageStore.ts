import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createAiUsageEvent } from '../services/aiPricing';
import { AiUsageContext, AiUsageEvent, GeminiUsageMeasurement } from '../types';
import { fileStorage } from '../utils/fileStorage';

interface AiUsageState {
    events: AiUsageEvent[];
    recordMeasurement: (context: AiUsageContext, measurement: GeminiUsageMeasurement) => void;
    clearUsage: () => void;
}

export const useAiUsageStore = create<AiUsageState>()(
    persist(
        (set) => ({
            events: [],
            recordMeasurement: (context, measurement) =>
                set((state) => {
                    if (
                        measurement.responseId &&
                        state.events.some((event) => event.responseId === measurement.responseId)
                    ) {
                        return state;
                    }

                    return {
                        events: [createAiUsageEvent(context, measurement), ...state.events],
                    };
                }),
            clearUsage: () => set({ events: [] }),
        }),
        {
            name: 'agent-qa-ai-usage',
            version: 1,
            storage: createJSONStorage(() => fileStorage),
            partialize: (state) => ({ events: state.events }),
        }
    )
);
