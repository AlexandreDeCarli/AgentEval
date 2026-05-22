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
            // Adiciona timestamp e headers rigorosos para desativar cache agressivo do Safari
            const res = await fetch(`${API_BASE}/${encodeURIComponent(name)}?t=${Date.now()}`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            if (res.ok) {
                const text = await res.text();
                if (text) {
                    localStorage.setItem(name, text);
                } else {
                    localStorage.removeItem(name);
                }
                return text || null;
            }
            // Arquivo não existe no servidor - tentar ler do localStorage
            return localStorage.getItem(name);
        } catch (e) {
            console.warn(`[fileStorage] Fallback para localStorage (${name}):`, e);
            return localStorage.getItem(name);
        }
    },

    setItem: async (name: string, value: string): Promise<void> => {
        // Sempre atualiza o localStorage localmente como backup síncrono imediato
        localStorage.setItem(name, value);
        
        if (!isDevServer()) return;
        
        try {
            await fetch(`${API_BASE}/${encodeURIComponent(name)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: value,
            });
        } catch (e) {
            console.warn(`[fileStorage] Erro ao salvar no dev server (${name}):`, e);
        }
    },

    removeItem: async (name: string): Promise<void> => {
        localStorage.removeItem(name);
        if (!isDevServer()) return;
        try {
            await fetch(`${API_BASE}/${encodeURIComponent(name)}`, { 
                method: 'DELETE',
            });
        } catch (e) {
            console.warn(`[fileStorage] Erro ao deletar no dev server (${name}):`, e);
        }
    },
};
