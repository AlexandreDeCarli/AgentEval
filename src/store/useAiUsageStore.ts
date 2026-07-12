import { create, StoreApi, UseBoundStore } from 'zustand';
import { createAiUsageEvent } from '../services/aiPricing';
import { AiUsageRepository, createAiUsageRepository } from '../services/aiUsageRepository';
import { AiUsageContext, AiUsageEvent, GeminiUsageMeasurement } from '../types';

interface AiUsageState {
    events: AiUsageEvent[];
    isHydrating: boolean;
    storageError: string | null;
    hydrateUsage: () => Promise<void>;
    recordMeasurement: (context: AiUsageContext, measurement: GeminiUsageMeasurement) => void;
    clearUsage: () => Promise<void>;
}

const mergeEvents = (loaded: AiUsageEvent[], current: AiUsageEvent[]): AiUsageEvent[] => {
    const seenIds = new Set<string>();
    const seenResponses = new Set<string>();
    return [...current, ...loaded]
        .sort((left, right) => right.occurredAt - left.occurredAt)
        .filter((event) => {
            if (seenIds.has(event.id) || (event.responseId && seenResponses.has(event.responseId))) return false;
            seenIds.add(event.id);
            if (event.responseId) seenResponses.add(event.responseId);
            return true;
        });
};

export const createAiUsageStore = (
    repository: AiUsageRepository
): UseBoundStore<StoreApi<AiUsageState>> => {
    const responseIds = new Set<string>();
    const store = create<AiUsageState>((set, get) => ({
        events: [],
        isHydrating: true,
        storageError: null,
        hydrateUsage: async () => {
            try {
                const loaded = await repository.load();
                set((state) => {
                    const events = mergeEvents(loaded, state.events);
                    responseIds.clear();
                    events.forEach((event) => {
                        if (event.responseId) responseIds.add(event.responseId);
                    });
                    return { events, isHydrating: false, storageError: null };
                });
            } catch (error) {
                set({
                    isHydrating: false,
                    storageError: error instanceof Error ? error.message : 'Unable to load AI usage history.',
                });
            }
        },
        recordMeasurement: (context, measurement) => {
            let createdEvent: AiUsageEvent | null = null;
            set((state) => {
                if (measurement.responseId && responseIds.has(measurement.responseId)) return state;
                createdEvent = createAiUsageEvent(context, measurement);
                if (createdEvent.responseId) responseIds.add(createdEvent.responseId);
                return { events: [createdEvent, ...state.events], storageError: null };
            });
            if (!createdEvent) return;
            void repository.append(createdEvent).catch((error) => {
                set({ storageError: error instanceof Error ? error.message : 'Unable to save AI usage event.' });
            });
        },
        clearUsage: async () => {
            const previousEvents = get().events;
            responseIds.clear();
            set({ events: [], storageError: null });
            try {
                await repository.clear();
            } catch (error) {
                previousEvents.forEach((event) => {
                    if (event.responseId) responseIds.add(event.responseId);
                });
                set({
                    events: previousEvents,
                    storageError: error instanceof Error ? error.message : 'Unable to clear AI usage history.',
                });
                throw error;
            }
        },
    }));
    return store;
};

export const useAiUsageStore = createAiUsageStore(createAiUsageRepository());
void useAiUsageStore.getState().hydrateUsage();
