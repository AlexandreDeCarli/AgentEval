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

const getLocalStorage = (): Storage | null => {
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
                            localStorage.setItem(name, text);
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
        const storage = getLocalStorage();
        try {
            if (storage) {
                storage.setItem(name, value);
            }
        } catch (e) {
            console.warn(`[fileStorage] localStorage quota exceeded for key "${name}" (${(value.length / 1024).toFixed(1)}KB):`, e);
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
