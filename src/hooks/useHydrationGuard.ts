import { useSyncExternalStore } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { useMissionStore } from '../store/useMissionStore';
import { useTestRunStore } from '../store/useTestRunStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useOnboardingStore } from '../store/useOnboardingStore';

/**
 * Tracks whether all persisted Zustand stores have finished hydrating
 * from async storage (localStorage / fileStorage).
 *
 * Without this guard, components can render with seed data before
 * the real persisted state is loaded, causing a "flash of default data"
 * that may trigger writes that overwrite saved state.
 */

const persistedStores = [
    useProjectStore,
    useMissionStore,
    useTestRunStore,
    useSettingsStore,
    useOnboardingStore,
] as const;

function getHydrationSnapshot(): boolean {
    return persistedStores.every(
        (store) => (store as unknown as { persist: { hasHydrated: () => boolean } }).persist.hasHydrated()
    );
}

function subscribeToHydration(callback: () => void): () => void {
    const unsubscribes = persistedStores.map((store) =>
        (store as unknown as { persist: { onFinishHydration: (fn: () => void) => () => void } })
            .persist.onFinishHydration(callback)
    );
    return () => unsubscribes.forEach((unsub) => unsub());
}

/**
 * Returns `true` once all stores are hydrated.
 * Safe to call during SSR (always returns `false` on server).
 */
export function useHydrationGuard(): boolean {
    return useSyncExternalStore(
        subscribeToHydration,
        getHydrationSnapshot,
        () => false // server snapshot
    );
}
