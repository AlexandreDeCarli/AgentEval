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

export const fileStorage = {
    getItem: async (name: string): Promise<string | null> => {
        if (!isDevServer()) return localStorage.getItem(name);
        try {
            const res = await fetch(`${API_BASE}/${encodeURIComponent(name)}`);
            if (res.ok) {
                const text = await res.text();
                return text || null;
            }
            // Arquivo não existe - migrar localStorage para arquivo se houver dados
            const lsData = localStorage.getItem(name);
            if (lsData) {
                console.info(`[fileStorage] Migrando "${name}" do localStorage para arquivo...`);
                await fileStorage.setItem(name, lsData);
                localStorage.removeItem(name);
                return lsData;
            }
            return null;
        } catch (e) {
            console.warn(`[fileStorage] Fallback para localStorage (${name}):`, e);
            return localStorage.getItem(name);
        }
    },

    setItem: async (name: string, value: string): Promise<void> => {
        if (!isDevServer()) { localStorage.setItem(name, value); return; }
        try {
            await fetch(`${API_BASE}/${encodeURIComponent(name)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: value,
            });
        } catch (e) {
            console.warn(`[fileStorage] Fallback para localStorage (${name}):`, e);
            localStorage.setItem(name, value);
        }
    },

    removeItem: async (name: string): Promise<void> => {
        if (!isDevServer()) { localStorage.removeItem(name); return; }
        try {
            await fetch(`${API_BASE}/${encodeURIComponent(name)}`, { method: 'DELETE' });
        } catch {
            localStorage.removeItem(name);
        }
    },
};
