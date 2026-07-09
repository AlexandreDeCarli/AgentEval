const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('esbuild');

const PROJECT_ROOT = path.join(__dirname, '..');

async function loadChatBubble() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenteval-chat-bubble-'));
    const outfile = path.join(tempDir, 'ChatBubble.cjs');
    fs.symlinkSync(path.join(PROJECT_ROOT, 'node_modules'), path.join(tempDir, 'node_modules'), 'dir');

    await build({
        entryPoints: [path.join(PROJECT_ROOT, 'src/components/ChatBubble.tsx')],
        outfile,
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: ['node20'],
        logLevel: 'silent',
        external: ['react'],
    });

    return {
        module: require(outfile),
        cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
    };
}

async function main() {
    const React = require('react');
    const ReactDOMServer = require('react-dom/server');
    const { module: chatBubbleModule, cleanup } = await loadChatBubble();

    try {
        const html = ReactDOMServer.renderToStaticMarkup(
            React.createElement(chatBubbleModule.ChatBubble, {
                animateTyping: true,
                message: {
                    id: 'msg-structured',
                    role: 'target',
                    content: JSON.stringify({
                        message: 'Saldo disponivel.',
                        confidence: 0.94,
                    }),
                    timestamp: 1783515600000,
                },
            })
        );

        assert.match(html, /Structured output/);
        assert.doesNotMatch(html, /Saldo disponivel\\.\"\\}/);
    } finally {
        cleanup();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
