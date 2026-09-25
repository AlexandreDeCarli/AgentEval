const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('esbuild');

async function loadModules() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenteval-sync-test-'));
    const outfile = path.join(tempDir, 'syncBundle.cjs');

    await build({
        entryPoints: [path.join(__dirname, '../../src/services/projectSyncCrypto.ts')],
        outfile,
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: ['node20'],
        logLevel: 'silent',
    });

    return {
        module: require(outfile),
        cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
    };
}

async function runTests() {
    console.log('Testing Project Sync Crypto...');
    const { module, cleanup } = await loadModules();

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
        const bundle = module.createProjectSyncBundle(dummyProject, dummyMissions, 'sac-bot');
        assert.equal(bundle.version, 1);
        assert.equal(bundle.syncId, 'sac-bot');
        assert.equal(bundle.project.id, 'proj-123');
        assert.equal(bundle.missions.length, 1);

        // 2. Encryption and Decryption Round-Trip
        const passkey = 'minha-senha-secreta-2026';
        const encryptedBytes = await module.encryptProjectBundle(bundle, passkey);
        assert.ok(encryptedBytes instanceof Uint8Array);
        assert.ok(encryptedBytes.length > 50);

        const decryptedBundle = await module.decryptProjectBundle(encryptedBytes, passkey);
        assert.deepEqual(decryptedBundle.project, dummyProject);
        assert.deepEqual(decryptedBundle.missions, dummyMissions);

        // 3. Incorrect Passkey Rejection
        await assert.rejects(
            async () => {
                await module.decryptProjectBundle(encryptedBytes, 'senha-incorreta');
            },
            /descriptografar|decrypt|invalid/i
        );

        console.log('✓ Project Sync Crypto tests passed!');
    } finally {
        cleanup();
    }
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
