import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

export function fileStorePlugin(dataDir = 'data'): Plugin {
    const resolvedDataDir = path.resolve(dataDir);

    return {
        name: 'file-store',
        configureServer(server) {
            server.middlewares.use('/api/store', (req, res, next) => {
                // key = filename (sanitized to prevent path traversal)
                const rawKey = req.url?.slice(1) ?? '';
                const key = path.basename(rawKey);
                if (!key) { next(); return; }

                const filePath = path.join(resolvedDataDir, `${key}.json`);

                if (req.method === 'GET') {
                    fs.mkdirSync(resolvedDataDir, { recursive: true });
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        res.setHeader('Content-Type', 'application/json; charset=utf-8');
                        res.end(content);
                    } else {
                        res.statusCode = 404;
                        res.end('');
                    }
                } else if (req.method === 'PUT') {
                    let body = '';
                    req.on('data', (chunk) => { body += chunk; });
                    req.on('end', () => {
                        try {
                            fs.mkdirSync(resolvedDataDir, { recursive: true });
                            fs.writeFileSync(filePath, body, 'utf-8');
                            res.setHeader('Content-Type', 'application/json');
                            res.end('{"ok":true}');
                        } catch (e: any) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: e.message }));
                        }
                    });
                } else if (req.method === 'DELETE') {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    res.end('{"ok":true}');
                } else {
                    next();
                }
            });
        },
    };
}
