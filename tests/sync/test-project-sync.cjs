const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('esbuild');

async function loadModules() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenteval-sync-test-'));
    const outfileCrypto = path.join(tempDir, 'syncCrypto.cjs');
    const outfileClient = path.join(tempDir, 'syncClient.cjs');
    const outfileWorker = path.join(tempDir, 'syncWorker.cjs');

    await build({
        entryPoints: [path.join(__dirname, '../../src/services/projectSyncCrypto.ts')],
        outfile: outfileCrypto,
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: ['node20'],
        logLevel: 'silent',
    });

    await build({
        entryPoints: [path.join(__dirname, '../../src/services/cloudSyncClient.ts')],
        outfile: outfileClient,
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: ['node20'],
        logLevel: 'silent',
    });

    await build({
        entryPoints: [path.join(__dirname, '../../serverless/cloudflare-worker-sync.js')],
        outfile: outfileWorker,
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: ['node20'],
        logLevel: 'silent',
    });

    return {
        cryptoModule: require(outfileCrypto),
        clientModule: require(outfileClient),
        workerModule: require(outfileWorker).default || require(outfileWorker),
        cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
    };
}

async function runTests() {
    console.log('Testing Project Sync Crypto, Worker Gateway & Client...');
    const { cryptoModule, clientModule, workerModule, cleanup } = await loadModules();

    try {
        const dummyProject = {
            id: 'proj-123',
            name: 'Atendimento SAC',
            description: 'Bot de atendimento',
            documentation: 'Docs',
            target_provider: 'http',
            system_prompts: [{ id: 'p1', name: 'Prompt 1', content: 'Ajude o cliente' }],
            environments: [],
            cloud_sync: {
                syncId: 'sac-bot',
                syncKeyEncrypted: 'sensitive-machine-local-token',
                lastSyncedAt: '2026-09-24T12:00:00.000Z',
                workerUrl: 'https://sync.potencial.tec.br',
            },
        };
        const dummyMissions = [
            {
                id: 'm1',
                project_id: 'proj-123',
                titulo: 'Missao 1',
                target_system_prompt: 'System prompt',
                expected_outcome: 'Outcome',
                max_turns: 5,
                success_criteria: [],
                api_config: { post_url: '', get_url: '', auth_header: '', payload_template: '', response_path: '', polling_interval: 2000, max_timeout: 30 }
            },
            {
                id: 'm2-other',
                project_id: 'proj-999', // should be excluded
                titulo: 'Missao Outro Projeto',
                target_system_prompt: '',
                expected_outcome: '',
                max_turns: 1,
                success_criteria: [],
                api_config: { post_url: '', get_url: '', auth_header: '', payload_template: '', response_path: '', polling_interval: 2000, max_timeout: 30 }
            }
        ];

        // 1. Packaging & Credential Sanitization
        console.log('  1. Bundle packaging & machine credential stripping...');
        const bundle = cryptoModule.createProjectSyncBundle(dummyProject, dummyMissions, 'sac-bot');
        assert.equal(bundle.version, 1);
        assert.equal(bundle.syncId, 'sac-bot');
        assert.equal(bundle.project.id, 'proj-123');
        assert.equal(bundle.missions.length, 1);
        assert.equal(bundle.missions[0].id, 'm1');
        // Machine-local encrypted token must be stripped
        assert.equal(bundle.project.cloud_sync.syncKeyEncrypted, undefined);

        // 2. Encryption and Decryption Round-Trip
        console.log('  2. AES-256-GCM + PBKDF2 round-trip...');
        const passkey = 'minha-senha-secreta-2026';
        const encryptedBytes = await cryptoModule.encryptProjectBundle(bundle, passkey);
        assert.ok(encryptedBytes instanceof Uint8Array);
        assert.ok(encryptedBytes.length > 50);

        const decryptedBundle = await cryptoModule.decryptProjectBundle(encryptedBytes, passkey);
        assert.equal(decryptedBundle.project.id, dummyProject.id);
        assert.equal(decryptedBundle.project.name, dummyProject.name);
        assert.deepEqual(decryptedBundle.missions, [dummyMissions[0]]);

        // 3. Incorrect Passkey Rejection
        console.log('  3. Rejection of invalid passkey...');
        await assert.rejects(
            async () => {
                await cryptoModule.decryptProjectBundle(encryptedBytes, 'senha-incorreta');
            },
            /descriptografar|decrypt|invalid/i
        );

        // 4. Tamper Resistance
        console.log('  4. Tamper resistance (corrupted ciphertext)...');
        const tamperedBytes = new Uint8Array(encryptedBytes);
        tamperedBytes[tamperedBytes.length - 5] ^= 0xff; // Flip bits in ciphertext
        await assert.rejects(
            async () => {
                await cryptoModule.decryptProjectBundle(tamperedBytes, passkey);
            },
            /descriptografar|decrypt|invalid/i
        );

        // 5. URL Normalization
        console.log('  5. URL normalization...');
        const { normalizeWorkerUrl } = clientModule;
        assert.equal(normalizeWorkerUrl('sync.potencial.tec.br'), 'https://sync.potencial.tec.br');
        assert.equal(normalizeWorkerUrl('http://localhost:8787/'), 'http://localhost:8787');
        assert.equal(normalizeWorkerUrl('https://worker.dev///'), 'https://worker.dev');
        assert.throws(() => normalizeWorkerUrl('   '), /não foi informada/i);

        // 6. Direct Cloudflare Worker Gateway Tests (Mock R2)
        console.log('  6. Cloudflare Worker gateway unit tests...');
        const r2Store = new Map();
        const mockR2Bucket = {
            async put(key, value, opts) {
                const buf = Buffer.isBuffer(value) ? value : Buffer.from(value);
                r2Store.set(key, {
                    value: buf,
                    customMetadata: opts?.customMetadata,
                    uploaded: new Date(),
                    httpEtag: '"mock-etag-1"',
                });
            },
            async get(key) {
                const item = r2Store.get(key);
                if (!item) return null;
                return {
                    body: item.value,
                    uploaded: item.uploaded,
                    httpEtag: item.httpEtag,
                };
            },
            async head(key) {
                const item = r2Store.get(key);
                if (!item) return null;
                return {
                    uploaded: item.uploaded,
                    httpEtag: item.httpEtag,
                };
            },
        };

        const env = {
            MY_BUCKET: mockR2Bucket,
            ORG_SECRET: 'empresa-secret-token',
        };

        // 6a. CORS OPTIONS
        const corsRes = await workerModule.fetch(new Request('https://worker.dev', { method: 'OPTIONS' }), env);
        assert.equal(corsRes.status, 200);
        assert.equal(corsRes.headers.get('Access-Control-Allow-Methods'), 'GET, PUT, HEAD, OPTIONS');

        // 6b. Missing credentials (401)
        const unauthRes = await workerModule.fetch(
            new Request('https://worker.dev', {
                method: 'GET',
                headers: { 'X-Org-Secret': 'empresa-secret-token' },
            }),
            env
        );
        assert.equal(unauthRes.status, 401);

        // 6c. Org secret mismatch (403)
        const badOrgRes = await workerModule.fetch(
            new Request('https://worker.dev', {
                method: 'GET',
                headers: {
                    'X-Sync-Id': 'sac-bot',
                    'Authorization': 'Bearer senha-123',
                    'X-Org-Secret': 'wrong-token',
                },
            }),
            env
        );
        assert.equal(badOrgRes.status, 403);

        // 6d. GET 404 before upload
        const notFoundRes = await workerModule.fetch(
            new Request('https://worker.dev', {
                method: 'GET',
                headers: {
                    'X-Sync-Id': 'sac-bot',
                    'Authorization': 'Bearer senha-123',
                    'X-Org-Secret': 'empresa-secret-token',
                },
            }),
            env
        );
        assert.equal(notFoundRes.status, 404);

        // 7. End-to-End Integration: Client <-> Worker Gateway
        console.log('  7. End-to-End Client <-> Worker Gateway push and pull...');
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (url, options) => {
            const req = new Request(url, options);
            return await workerModule.fetch(req, env);
        };

        try {
            // Push via client
            const pushRes = await clientModule.pushProjectToCloud({
                workerUrl: 'https://sync.potencial.tec.br',
                syncId: 'sac-bot',
                passkey: 'senha-123',
                project: dummyProject,
                missions: dummyMissions,
                orgSecret: 'empresa-secret-token',
            });
            assert.equal(pushRes.ok, true);
            assert.ok(pushRes.syncedAt);

            // Verify isolated R2 storage
            assert.equal(r2Store.size, 1);
            const storedKey = Array.from(r2Store.keys())[0];
            assert.match(storedKey, /^projects\/[a-f0-9]{64}\/bundle\.enc$/);

            // Status check via client
            const statusRes = await clientModule.checkCloudProjectStatus({
                workerUrl: 'https://sync.potencial.tec.br',
                syncId: 'sac-bot',
                passkey: 'senha-123',
                orgSecret: 'empresa-secret-token',
            });
            assert.equal(statusRes.exists, true);
            assert.equal(statusRes.etag, '"mock-etag-1"');

            // Pull via client
            const pulledBundle = await clientModule.pullProjectFromCloud({
                workerUrl: 'https://sync.potencial.tec.br',
                syncId: 'sac-bot',
                passkey: 'senha-123',
                orgSecret: 'empresa-secret-token',
            });
            assert.equal(pulledBundle.syncId, 'sac-bot');
            assert.equal(pulledBundle.project.id, dummyProject.id);
            assert.equal(pulledBundle.project.name, dummyProject.name);
            assert.equal(pulledBundle.missions.length, 1);
            assert.equal(pulledBundle.missions[0].id, 'm1');

            // Pull with different passkey fails (isolated path gives 404 or decryption fails)
            await assert.rejects(
                async () => {
                    await clientModule.pullProjectFromCloud({
                        workerUrl: 'https://sync.potencial.tec.br',
                        syncId: 'sac-bot',
                        passkey: 'outra-senha',
                        orgSecret: 'empresa-secret-token',
                    });
                },
                /Nenhum projeto encontrado|descriptografar/i
            );

        } finally {
            globalThis.fetch = originalFetch;
        }

        console.log('✓ ALL Project Sync Crypto, Worker Gateway & Client tests passed!');
    } finally {
        cleanup();
    }
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
