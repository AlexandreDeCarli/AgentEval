const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('esbuild');

const PROJECT_ROOT = path.join(__dirname, '..');

async function loadFormatter() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenteval-chat-formatting-'));
    const outfile = path.join(tempDir, 'chatMessageFormatting.cjs');

    await build({
        entryPoints: [path.join(PROJECT_ROOT, 'src/utils/chatMessageFormatting.ts')],
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
    const { module: formatter, cleanup } = await loadFormatter();

    try {
        const functionCall = formatter.describeChatMessageContent(JSON.stringify({
            userResponse: 'Vou consultar o saldo antes de responder.',
            functionToExecute: 'getBalance',
            parameters: {
                accountId: 'acc_123',
                includePending: true,
            },
        }));

        assert.equal(functionCall.kind, 'function_call');
        assert.equal(functionCall.title, 'Function call');
        assert.equal(functionCall.responseText, 'Vou consultar o saldo antes de responder.');
        assert.equal(functionCall.functionName, 'getBalance');
        assert.match(functionCall.formattedJson, /"includePending": true/);

        const structuredOutput = formatter.describeChatMessageContent(`
\`\`\`json
{
  "message": "Pedido encontrado.",
  "missionCompleted": false,
  "confidence": 0.82
}
\`\`\`
        `);

        assert.equal(structuredOutput.kind, 'structured_output');
        assert.equal(structuredOutput.title, 'Structured output');
        assert.deepEqual(structuredOutput.topLevelKeys, ['message', 'missionCompleted', 'confidence']);
        assert.match(structuredOutput.formattedJson, /"confidence": 0.82/);

        const plainText = formatter.describeChatMessageContent('Pedido encontrado. Posso ajudar em algo mais?');
        assert.equal(plainText.kind, 'plain_text');
        assert.equal(plainText.text, 'Pedido encontrado. Posso ajudar em algo mais?');
    } finally {
        cleanup();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
