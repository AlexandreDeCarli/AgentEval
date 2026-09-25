/**
 * Cloudflare Worker: AgentEval Per-Project Cloud Sync Gateway
 * Bindings required:
 * - MY_BUCKET: R2 Bucket binding
 * - Optional Environment Variable: ORG_SECRET (if you want to restrict to your team)
 */

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '*';
        const corsHeaders = {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, PUT, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Sync-Id, Authorization, X-Org-Secret',
            'Access-Control-Max-Age': '86400',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Optional Organization-wide secret protection
        if (env.ORG_SECRET) {
            const clientOrgSecret = request.headers.get('X-Org-Secret');
            if (clientOrgSecret !== env.ORG_SECRET) {
                return new Response(
                    JSON.stringify({ error: 'Chave da Organização inválida ou não informada.' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        const syncId = request.headers.get('X-Sync-Id')?.trim()?.toLowerCase();
        const authHeader = request.headers.get('Authorization')?.trim(); // Bearer <passkey>

        if (!syncId || !authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(
                JSON.stringify({ error: 'Sync ID e Senha do Projeto são obrigatórios.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const passkey = authHeader.substring(7).trim();
        if (!passkey) {
            return new Response(
                JSON.stringify({ error: 'Senha do Projeto não informada.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Derive isolated SHA-256 storage key
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest(
            'SHA-256',
            encoder.encode(`${syncId}:${passkey}`)
        );
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const projectHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        const objectKey = `projects/${projectHash}/bundle.enc`;

        // 1. HEAD (Check existence / metadata)
        if (request.method === 'HEAD') {
            const object = await env.MY_BUCKET.head(objectKey);
            if (!object) {
                return new Response(null, { status: 404, headers: corsHeaders });
            }
            return new Response(null, {
                status: 200,
                headers: {
                    ...corsHeaders,
                    'ETag': object.httpEtag,
                    'Last-Modified': object.uploaded.toUTCString(),
                },
            });
        }

        // 2. GET (Pull Project Bundle)
        if (request.method === 'GET') {
            const object = await env.MY_BUCKET.get(objectKey);
            if (!object) {
                return new Response(
                    JSON.stringify({ error: 'Nenhum projeto encontrado para este Sync ID e Senha.' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            return new Response(object.body, {
                status: 200,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/octet-stream',
                    'ETag': object.httpEtag,
                    'Last-Modified': object.uploaded.toUTCString(),
                    'Cache-Control': 'no-store, no-cache',
                },
            });
        }

        // 3. PUT (Push Project Bundle)
        if (request.method === 'PUT') {
            const body = await request.arrayBuffer();
            if (!body || body.byteLength < 32) {
                return new Response(
                    JSON.stringify({ error: 'Payload vazio ou inválido.' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            await env.MY_BUCKET.put(objectKey, body, {
                customMetadata: {
                    syncId,
                    syncedAt: new Date().toISOString(),
                },
            });

            return new Response(
                JSON.stringify({ ok: true, syncedAt: new Date().toISOString() }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    },
};
