const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('esbuild');

const PROJECT_ROOT = path.join(__dirname, '..');

async function loadTargetApi() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenteval-target-api-'));
    const outfile = path.join(tempDir, 'targetApi.cjs');

    await build({
        entryPoints: [path.join(PROJECT_ROOT, 'src/services/targetApi.ts')],
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

async function main() {
    const { module: targetApi, cleanup } = await loadTargetApi();
    const apiConfig = {
        post_url: 'https://target.example/send',
        get_url: 'https://target.example/history',
        auth_header: '',
        payload_template: '{"message":"{{message}}"}',
        response_path: '',
        polling_interval: 1,
        max_timeout: 1,
    };

    const structuredOutput = {
        userResponse: 'Vou consultar o saldo antes de responder.',
        functionToExecute: 'getBalance',
        parameters: {
            accountId: 'acc_123',
        },
    };

    let responseMessages = [
        {
            id: 10,
            role: 'model',
            content: JSON.stringify(structuredOutput),
            contentStatus: 'processed',
        },
    ];

    global.fetch = async () => ({
        ok: true,
        status: 200,
        async json() {
            return responseMessages;
        },
    });

    try {
        let received;
        await targetApi.pollTargetResponse(
            apiConfig,
            new Set(),
            (msgId, content, status, structuredContent) => {
                received = { msgId, content, status, structuredContent };
            }
        );

        assert.equal(received.msgId, '10');
        assert.equal(received.content, 'Vou consultar o saldo antes de responder.');
        assert.equal(received.status, 'processed');
        assert.match(received.structuredContent, /"functionToExecute":"getBalance"/);

        responseMessages = [
            {
                id: 11,
                role: 'model',
                content: JSON.stringify({
                    userResponse: 'Saldo encontrado.',
                    extractedData: {
                        availableBalance: 1250,
                    },
                }),
                contentStatus: 'processed',
            },
        ];

        let receivedStructuredOnly;
        await targetApi.pollTargetResponse(
            apiConfig,
            new Set(),
            (msgId, content, status, structuredContent) => {
                receivedStructuredOnly = { msgId, content, status, structuredContent };
            }
        );

        assert.equal(receivedStructuredOnly.msgId, '11');
        assert.equal(receivedStructuredOnly.content, 'Saldo encontrado.');
        assert.match(receivedStructuredOnly.structuredContent, /"extractedData"/);
    } finally {
        cleanup();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
