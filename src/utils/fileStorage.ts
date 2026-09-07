/**
 * Zustand StateStorage adapter que persiste em arquivos JSON via API do Vite dev server.
 * Em produção (build), faz fallback para localStorage.
 */

const API_BASE = '/api/store';

const isDevServer = (): boolean => {
    try {
        return import.meta.env.DEV === true;
    } catch {
        return false;
    }
};

import { StateStorage } from 'zustand/middleware';

export const getLocalStorage = (): Storage | null => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage;
        }
        if (typeof localStorage !== 'undefined') {
            return localStorage;
        }
    } catch {
        // Restricted or unavailable
    }
    return null;
};

export const isQuotaExceededError = (e: unknown): boolean => {
    if (!e || typeof e !== 'object') return false;
    const err = e as { name?: string; code?: number; number?: number };
    return (
        err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014 ||
        err.number === -2147024882
    );
};

export const cleanBulkyLocalStorage = (): void => {
    const storage = getLocalStorage();
    if (!storage) return;
    try {
        storage.removeItem('agent-qa-ai-usage');
    } catch {}
    try {
        const runs = storage.getItem('agent-qa-test-runs');
        if (runs && runs.length > 50000) {
            console.warn('[fileStorage] Found bulky agent-qa-test-runs in localStorage, purging to free quota');
            storage.removeItem('agent-qa-test-runs');
        }
    } catch {}
};

export const safeLocalStorageSet = (name: string, value: string): void => {
    const storage = getLocalStorage();
    if (!storage) return;
    try {
        storage.setItem(name, value);
    } catch (err) {
        if (isQuotaExceededError(err)) {
            console.warn(`[fileStorage] QuotaExceededError writing "${name}" (${(value.length / 1024).toFixed(1)}KB). Running auto-eviction...`);
            // Priority 1: Delete disposable bulky items from localStorage
            try { storage.removeItem('agent-qa-test-runs'); } catch {}
            try { storage.removeItem('agent-qa-ai-usage'); } catch {}

            // Retry saving the critical item
            try {
                storage.setItem(name, value);
                console.log(`[fileStorage] Successfully saved "${name}" after auto-eviction.`);
                return;
            } catch (retryErr) {
                console.error(`[fileStorage] Critical: localStorage still exceeded quota after eviction for "${name}":`, retryErr);
                throw retryErr;
            }
        }
        throw err;
    }
};

export const fileStorage: StateStorage = {
    getItem: (name: string): string | null | Promise<string | null> => {
        const storage = getLocalStorage();
        if (!isDevServer()) {
            try {
                return storage ? storage.getItem(name) : null;
            } catch (e) {
                console.warn(`[fileStorage] localStorage.getItem failed for "${name}":`, e);
                return null;
            }
        }

        return (async () => {
            try {
                const res = await fetch(`${API_BASE}/${encodeURIComponent(name)}?t=${Date.now()}`, {
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });
                if (res.ok) {
                    const text = await res.text();
                    try {
                        if (text) {
                            safeLocalStorageSet(name, text);
                        } else {
                            localStorage.removeItem(name);
                        }
                    } catch {}
                    return text || null;
                }
                try {
                    return storage ? storage.getItem(name) : null;
                } catch {
                    return null;
                }
            } catch (e) {
                console.warn(`[fileStorage] Fallback para localStorage (${name}):`, e);
                try {
                    return storage ? storage.getItem(name) : null;
                } catch {
                    return null;
                }
            }
        })();
    },

    setItem: (name: string, value: string): void | Promise<void> => {
        try {
            safeLocalStorageSet(name, value);
        } catch (e) {
            console.warn(`[fileStorage] localStorage setItem failed for "${name}":`, e);
            throw e;
        }
        
        if (!isDevServer()) return;
        
        return (async () => {
            try {
                await fetch(`${API_BASE}/${encodeURIComponent(name)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                    body: value,
                });
            } catch (e) {
                console.warn(`[fileStorage] Erro ao salvar no dev server (${name}):`, e);
            }
        })();
    },

    removeItem: (name: string): void | Promise<void> => {
        const storage = getLocalStorage();
        try {
            if (storage) {
                storage.removeItem(name);
            }
        } catch (e) {
            console.warn(`[fileStorage] localStorage.removeItem failed for "${name}":`, e);
        }

        if (!isDevServer()) return;

        return (async () => {
            try {
                await fetch(`${API_BASE}/${encodeURIComponent(name)}`, { 
                    method: 'DELETE',
                });
            } catch (e) {
                console.warn(`[fileStorage] Erro ao deletar no dev server (${name}):`, e);
            }
        })();
    },
};
