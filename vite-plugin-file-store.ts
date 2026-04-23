import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

interface StoreRequest {
    url?: string;
    method?: string;
    on?: ((event: 'data', listener: (chunk: string) => void) => void) &
        ((event: 'end', listener: () => void) => void);
}

interface StoreResponse {
    statusCode?: number;
    setHeader?: (name: string, value: string) => void;
    end?: (body?: string) => void;
}

export function fileStorePlugin(dataDir = 'data'): Plugin {
    const resolvedDataDir = path.resolve(dataDir);

    return {
        name: 'file-store',
        configureServer(server) {
            server.middlewares.use(
                '/api/store',
                (req, res, next) => {
                    const storeReq = req as unknown as StoreRequest;
                    const storeRes = res as unknown as StoreResponse;

                // key = filename (sanitized to prevent path traversal)
                    const rawKey = storeReq.url?.slice(1) ?? '';
                    const key = path.basename(rawKey);
                    if (!key) { next(); return; }

                    const filePath = path.join(resolvedDataDir, `${key}.json`);

                    if (storeReq.method === 'GET') {
                        fs.mkdirSync(resolvedDataDir, { recursive: true });
                        if (fs.existsSync(filePath)) {
                            const content = fs.readFileSync(filePath, 'utf-8');
                            storeRes.setHeader?.('Content-Type', 'application/json; charset=utf-8');
                            storeRes.end?.(content);
                        } else {
                            storeRes.statusCode = 404;
                            storeRes.end?.('');
                        }
                    } else if (storeReq.method === 'PUT') {
                        let body = '';
                        storeReq.on?.('data', (chunk) => { body += chunk; });
                        storeReq.on?.('end', () => {
                            try {
                                fs.mkdirSync(resolvedDataDir, { recursive: true });
                                fs.writeFileSync(filePath, body, 'utf-8');
                                storeRes.setHeader?.('Content-Type', 'application/json');
                                storeRes.end?.('{"ok":true}');
                            } catch (error) {
                                const message =
                                    error instanceof Error ? error.message : 'Unknown error';
                                storeRes.statusCode = 500;
                                storeRes.end?.(JSON.stringify({ error: message }));
                            }
                        });
                    } else if (storeReq.method === 'DELETE') {
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                        storeRes.end?.('{"ok":true}');
                    } else {
                        next();
                    }
                }
            );
        },
    };
}
