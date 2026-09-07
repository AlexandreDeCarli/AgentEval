import { StateStorage } from 'zustand/middleware';
import { safeLocalStorageSet, getLocalStorage } from './fileStorage';

const DB_NAME = 'agenteval-storage';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';
const API_BASE = '/api/store';

const isDevServer = (): boolean => {
    try {
        return import.meta.env.DEV === true;
    } catch {
        return false;
    }
};

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            dbPromise = null;
            reject(new Error('IndexedDB is not supported in this environment'));
            return;
        }
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            dbPromise = null;
            reject(request.error || new Error('Failed to open IndexedDB'));
        };
    });
    return dbPromise;
};

export const idbStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        // In dev server, prefer dev server file if available
        if (isDevServer()) {
            try {
                const res = await fetch(`${API_BASE}/${encodeURIComponent(name)}?t=${Date.now()}`, {
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                    }
                });
                if (res.ok) {
                    const text = await res.text();
                    if (text) return text;
                }
            } catch {
                // Fall back to IDB
            }
        }

        // 1. Try IndexedDB
        try {
            const db = await getDB();
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(name);
            const value = await new Promise<string | null>((resolve, reject) => {
                req.onsuccess = () => resolve((req.result as string) ?? null);
                req.onerror = () => reject(req.error);
            });

            if (value !== null) {
                // Also ensure it's removed from localStorage so it doesn't take quota
                const ls = getLocalStorage();
                if (ls && ls.getItem(name) !== null) {
                    try { ls.removeItem(name); } catch {}
                }
                return value;
            }
        } catch (idbErr) {
            console.warn(`[idbStorage] IndexedDB read failed for "${name}":`, idbErr);
        }

        // 2. Migration: Check localStorage
        const storage = getLocalStorage();
        if (storage) {
            try {
                const legacy = storage.getItem(name);
                if (legacy) {
                    // Migrate to IndexedDB in background
                    try {
                        const db = await getDB();
                        const tx = db.transaction(STORE_NAME, 'readwrite');
                        tx.objectStore(STORE_NAME).put(legacy, name);
                        storage.removeItem(name);
                        console.log(`[idbStorage] Successfully migrated "${name}" from localStorage to IndexedDB!`);
                    } catch (migErr) {
                        console.warn(`[idbStorage] Migration error for "${name}":`, migErr);
                    }
                    return legacy;
                }
            } catch (lsErr) {
                console.warn(`[idbStorage] localStorage fallback read failed for "${name}":`, lsErr);
            }
        }

        return null;
    },

    setItem: async (name: string, value: string): Promise<void> => {
        let idbSuccess = false;
        try {
            const db = await getDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(value, name);
            await new Promise<void>((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            });
            idbSuccess = true;

            // Remove from localStorage so it never consumes the 5MB quota!
            const storage = getLocalStorage();
            if (storage && storage.getItem(name) !== null) {
                try { storage.removeItem(name); } catch {}
            }
        } catch (idbErr) {
            console.warn(`[idbStorage] IndexedDB write failed for "${name}":`, idbErr);
        }

        // If IDB failed, fall back to safe localStorage with quota recovery
        if (!idbSuccess) {
            try {
                safeLocalStorageSet(name, value);
            } catch (fallbackErr) {
                console.error(`[idbStorage] Fallback storage failed for "${name}":`, fallbackErr);
            }
        }

        // Sync to dev server if in dev mode
        if (isDevServer()) {
            try {
                await fetch(`${API_BASE}/${encodeURIComponent(name)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                    body: value,
                });
            } catch (devErr) {
                console.warn(`[idbStorage] Dev server sync failed for "${name}":`, devErr);
            }
        }
    },

    removeItem: async (name: string): Promise<void> => {
        try {
            const db = await getDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(name);
            await new Promise<void>((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            });
        } catch (idbErr) {
            console.warn(`[idbStorage] IndexedDB delete failed for "${name}":`, idbErr);
        }

        const storage = getLocalStorage();
        if (storage) {
            try { storage.removeItem(name); } catch {}
        }

        if (isDevServer()) {
            try {
                await fetch(`${API_BASE}/${encodeURIComponent(name)}`, { method: 'DELETE' });
            } catch (devErr) {
                console.warn(`[idbStorage] Dev server delete failed for "${name}":`, devErr);
            }
        }
    },
};
