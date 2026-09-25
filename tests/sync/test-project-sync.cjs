const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('esbuild');

async function loadModules() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenteval-sync-test-'));
    const outfileCrypto = path.join(tempDir, 'syncCrypto.cjs');
    const outfileClient = path.join(tempDir, 'syncClient.cjs');

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

    return {
        cryptoModule: require(outfileCrypto),
        clientModule: require(outfileClient),
        cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
    };
}

async function runTests() {
    console.log('Testing Project Sync Crypto & Client...');
    const { cryptoModule, clientModule, cleanup } = await loadModules();

    try {
        const dummyProject = {
            id: 'proj-123',
            name: 'Atendimento SAC',
            description: 'Bot de atendimento',
            documentation: 'Docs',
            target_provider: 'http',
            system_prompts: [{ id: 'p1', name: 'Prompt 1', content: 'Ajude o cliente' }],
            environments: [],
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
            }
        ];

        // 1. Packaging
        const bundle = cryptoModule.createProjectSyncBundle(dummyProject, dummyMissions, 'sac-bot');
        assert.equal(bundle.version, 1);
        assert.equal(bundle.syncId, 'sac-bot');
        assert.equal(bundle.project.id, 'proj-123');
        assert.equal(bundle.missions.length, 1);

        // 2. Encryption and Decryption Round-Trip
        const passkey = 'minha-senha-secreta-2026';
        const encryptedBytes = await cryptoModule.encryptProjectBundle(bundle, passkey);
        assert.ok(encryptedBytes instanceof Uint8Array);
        assert.ok(encryptedBytes.length > 50);

        const decryptedBundle = await cryptoModule.decryptProjectBundle(encryptedBytes, passkey);
        assert.deepEqual(decryptedBundle.project, dummyProject);
        assert.deepEqual(decryptedBundle.missions, dummyMissions);

        // 3. Incorrect Passkey Rejection
        await assert.rejects(
            async () => {
                await cryptoModule.decryptProjectBundle(encryptedBytes, 'senha-incorreta');
            },
            /descriptografar|decrypt|invalid/i
        );

        // 4. URL Normalization
        const { normalizeWorkerUrl } = clientModule;
        assert.equal(normalizeWorkerUrl('sync.potencial.tec.br'), 'https://sync.potencial.tec.br');
        assert.equal(normalizeWorkerUrl('http://localhost:8787/'), 'http://localhost:8787');
        assert.equal(normalizeWorkerUrl('https://worker.dev///'), 'https://worker.dev');
        assert.throws(() => normalizeWorkerUrl('   '), /não foi informada/i);

        // 5. CloudSyncClient Push and Pull (mocked network)
        let savedStorage = null;
        let lastHeaders = null;
        let lastMethod = null;

        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (url, options) => {
            lastMethod = options.method;
            lastHeaders = options.headers;

            if (options.method === 'PUT') {
                savedStorage = options.body;
                return new Response(JSON.stringify({ ok: true, syncedAt: '2026-09-25T18:00:00.000Z' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            if (options.method === 'GET') {
                if (!savedStorage) {
                    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
                }
                return new Response(savedStorage, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'ETag': 'W/"test-etag"',
                        'Last-Modified': 'Fri, 25 Sep 2026 18:00:00 GMT',
                    },
                });
            }

            if (options.method === 'HEAD') {
                if (!savedStorage) {
                    return new Response(null, { status: 404 });
                }
                return new Response(null, {
                    status: 200,
                    headers: {
                        'ETag': 'W/"test-etag"',
                        'Last-Modified': 'Fri, 25 Sep 2026 18:00:00 GMT',
                    },
                });
            }

            return new Response('Not allowed', { status: 405 });
        };

        try {
            // Push
            const pushResult = await clientModule.pushProjectToCloud({
                workerUrl: 'https://sync.potencial.tec.br',
                syncId: 'sac-bot',
                passkey: 'senha-123',
                project: dummyProject,
                missions: dummyMissions,
            });
            assert.equal(pushResult.ok, true);
            assert.equal(lastMethod, 'PUT');
            assert.equal(lastHeaders['X-Sync-Id'], 'sac-bot');
            assert.equal(lastHeaders['Authorization'], 'Bearer senha-123');

            // Status check
            const statusResult = await clientModule.checkCloudProjectStatus({
                workerUrl: 'https://sync.potencial.tec.br',
                syncId: 'sac-bot',
                passkey: 'senha-123',
            });
            assert.equal(statusResult.exists, true);
            assert.equal(statusResult.etag, 'W/"test-etag"');

            // Pull
            const pulledBundle = await clientModule.pullProjectFromCloud({
                workerUrl: 'https://sync.potencial.tec.br',
                syncId: 'sac-bot',
                passkey: 'senha-123',
            });
            assert.equal(pulledBundle.syncId, 'sac-bot');
            assert.deepEqual(pulledBundle.project, dummyProject);
            assert.deepEqual(pulledBundle.missions, dummyMissions);

            // Pull with wrong passkey
            await assert.rejects(
                async () => {
                    await clientModule.pullProjectFromCloud({
                        workerUrl: 'https://sync.potencial.tec.br',
                        syncId: 'sac-bot',
                        passkey: 'senha-errada',
                    });
                },
                /descriptografar|senha/i
            );
        } finally {
            globalThis.fetch = originalFetch;
        }

        console.log('✓ Project Sync Crypto & Client tests passed!');
    } finally {
        cleanup();
    }
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
