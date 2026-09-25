const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('esbuild');

async function loadModules() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenteval-live-sync-test-'));
    const outfileCrypto = path.join(tempDir, 'syncCrypto.cjs');
    const outfileClient = path.join(tempDir, 'syncClient.cjs');

    await build({
        entryPoints: [path.join(__dirname, '../src/services/projectSyncCrypto.ts')],
        outfile: outfileCrypto,
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: ['node20'],
        logLevel: 'silent',
    });

    await build({
        entryPoints: [path.join(__dirname, '../src/services/cloudSyncClient.ts')],
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

async function runLiveTest() {
    console.log('Testing LIVE Cloudflare Worker Gateway: https://agenteval-sync.alexandre-23b.workers.dev/ ...');
    const { cryptoModule, clientModule, cleanup } = await loadModules();

    const LIVE_URL = 'https://agenteval-sync.alexandre-23b.workers.dev/';
    const testSyncId = `test-live-${Date.now()}`;
    const testPasskey = 'senha-super-secreta-ao-vivo-2026';

    try {
        const dummyProject = {
            id: `proj-${Date.now()}`,
            name: 'Projeto Teste Ao Vivo',
            description: 'Validação em tempo real contra Cloudflare Worker e R2',
            documentation: 'Documentação de teste ao vivo',
            target_provider: 'http',
            system_prompts: [
                { id: 'sp-1', name: 'Atendente Virtual', content: 'Você é um assistente prestativo.' }
            ],
            environments: [
                {
                    id: 'env-1',
                    name: 'Produção',
                    api_config: {
                        post_url: 'https://api.empresa.com/chat',
                        get_url: '',
                        auth_header: 'Bearer 123456',
                        payload_template: '{"message": "{{input}}"}',
                        response_path: 'reply',
                        polling_interval: 2000,
                        max_timeout: 30
                    }
                }
            ],
        };

        const dummyMissions = [
            {
                id: `miss-${Date.now()}`,
                project_id: dummyProject.id,
                titulo: 'Missão de Validação ao Vivo',
                target_system_prompt: 'sp-1',
                expected_outcome: 'Responder cordialidade',
                max_turns: 3,
                success_criteria: [
                    { id: 'crit-1', name: 'Cordialidade', description: 'O bot foi educado' }
                ],
                api_config: dummyProject.environments[0].api_config,
            }
        ];

        console.log(`1. Checando se syncId "${testSyncId}" existe na nuvem antes do upload...`);
        const preCheck = await clientModule.checkCloudProjectStatus({
            workerUrl: LIVE_URL,
            syncId: testSyncId,
            passkey: testPasskey,
        });
        console.log('   Resultado pré-check:', preCheck);
        assert.equal(preCheck.exists, false, 'Não deveria existir antes do push');

        console.log('2. Realizando PUSH criptografado (AES-256-GCM + PBKDF2) para o Worker real...');
        const pushResult = await clientModule.pushProjectToCloud({
            workerUrl: LIVE_URL,
            syncId: testSyncId,
            passkey: testPasskey,
            project: dummyProject,
            missions: dummyMissions,
        });
        console.log('   ✓ Push concluído com sucesso!');
        console.log('   Timestamp retornado pela nuvem:', pushResult.syncedAt);
        assert.equal(pushResult.ok, true);

        console.log('3. Checando STATUS após push (HEAD request)...');
        const postCheck = await clientModule.checkCloudProjectStatus({
            workerUrl: LIVE_URL,
            syncId: testSyncId,
            passkey: testPasskey,
        });
        console.log('   ✓ Status:', postCheck);
        assert.equal(postCheck.exists, true, 'Deveria existir agora');

        console.log('4. Realizando PULL da nuvem (GET + Descriptografia AES-256-GCM)...');
        const pulledBundle = await clientModule.pullProjectFromCloud({
            workerUrl: LIVE_URL,
            syncId: testSyncId,
            passkey: testPasskey,
        });
        console.log('   ✓ Download e descriptografia concluídos com sucesso!');
        console.log('   Nome do projeto baixado:', pulledBundle.project.name);
        console.log('   Total de missões baixadas:', pulledBundle.missions.length);

        assert.equal(pulledBundle.version, 1);
        assert.equal(pulledBundle.syncId, testSyncId);
        assert.equal(pulledBundle.project.id, dummyProject.id);
        assert.equal(pulledBundle.project.name, dummyProject.name);
        assert.equal(pulledBundle.project.system_prompts.length, 1);
        assert.equal(pulledBundle.project.environments.length, 1);
        assert.equal(pulledBundle.missions.length, 1);
        assert.equal(pulledBundle.missions[0].id, dummyMissions[0].id);

        console.log('5. Testando PULL com senha errada contra o Worker real...');
        await assert.rejects(
            async () => {
                await clientModule.pullProjectFromCloud({
                    workerUrl: LIVE_URL,
                    syncId: testSyncId,
                    passkey: 'senha-errada-propositalmente',
                });
            },
            (err) => {
                console.log('   ✓ Worker e cliente rejeitaram com segurança a senha errada:', err.message);
                return true;
            }
        );

        console.log('\n🎉 TESTE AO VIVO 100% BEM-SUCEDIDO COM A URL REAL!');
    } finally {
        cleanup();
    }
}

runLiveTest().catch((err) => {
    console.error('❌ Falha no teste ao vivo:', err);
    process.exit(1);
});
