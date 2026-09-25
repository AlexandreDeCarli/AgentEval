const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const fs = require('node:fs');

async function compileParser() {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'agenteval-parser-test-'));
    const outfile = path.join(tmpDir, 'parser.cjs');

    await esbuild.build({
        stdin: {
            contents: `
                export * from './src/utils/llmJsonParser.ts';
                export * from './src/services/llm.ts';
            `,
            resolveDir: path.resolve(__dirname, '../..'),
            loader: 'ts',
        },
        bundle: true,
        platform: 'node',
        format: 'cjs',
        outfile,
    });

    return { tmpDir, module: require(outfile) };
}

async function runTests() {
    console.log('--- Testing Resilient LLM JSON Parser ---');
    const { module } = await compileParser();
    const { extractLlmJson } = module;

    // 1. Pure clean JSON
    const test1 = extractLlmJson('{"reasoning": "ok", "message": "Hi", "missionCompleted": false}');
    assert.deepEqual(test1, { reasoning: 'ok', message: 'Hi', missionCompleted: false });
    console.log('✓ Pure JSON parsed');

    // 2. Markdown code fences with leading and trailing chatter
    const test2 = extractLlmJson(`
        Here is the JSON you requested:
        \`\`\`json
        {
            "reasoning": "Goal in progress",
            "message": "Can you help me with an order?",
            "missionCompleted": false
        }
        \`\`\`
        Let me know if you need anything else!
    `);
    assert.equal(test2.message, 'Can you help me with an order?');
    assert.equal(test2.missionCompleted, false);
    console.log('✓ Markdown code block with surrounding conversation parsed');

    // 3. DeepSeek-R1 / Qwen thinking tags (<think>...</think>)
    const test3 = extractLlmJson(`
        <think>
        The user is testing customer support.
        We should ask for the order ID.
        </think>
        \`\`\`json
        {
            "reasoning": "Need order ID",
            "message": "My order number is #12345",
            "missionCompleted": false
        }
        \`\`\`
    `);
    assert.equal(test3.message, 'My order number is #12345');
    console.log('✓ <think> tag stripping parsed');

    // 4. Literal unescaped newlines in JSON strings & trailing comma
    const test4 = extractLlmJson(`{
        "reasoning": "Multi-line
reasoning here",
        "message": "Hello,
I need help with my account.
Thanks!",
        "missionCompleted": false,
    }`);
    assert.equal(test4.missionCompleted, false);
    assert.ok(test4.message.includes('I need help'));
    console.log('✓ Literal unescaped newlines and trailing comma parsed');

    // 5. Smart curly quotes
    const test5 = extractLlmJson(`{
        “reasoning”: “curly quotes test”,
        “message”: “Testing smart quotes”,
        “missionCompleted”: true
    }`);
    assert.equal(test5.message, 'Testing smart quotes');
    assert.equal(test5.missionCompleted, true);
    console.log('✓ Smart curly quotes parsed');

    // 6. Root array of objects
    const test6 = extractLlmJson(`
        [
            {"titulo": "Mission 1", "max_turns": 5},
            {"titulo": "Mission 2", "max_turns": 8}
        ]
    `);
    assert.ok(Array.isArray(test6));
    assert.equal(test6.length, 2);
    assert.equal(test6[0].titulo, 'Mission 1');
    console.log('✓ Root array preservation parsed');

    // 7. Fallback for conversational tester output without any JSON
    const test7 = extractLlmJson('Hello, I would like to check the balance of my gift card.', {
        fallbackExtract: (cleaned) => ({ message: cleaned, missionCompleted: false }),
    });
    assert.equal(test7.message, 'Hello, I would like to check the balance of my gift card.');
    assert.equal(test7.missionCompleted, false);
    console.log('✓ Fallback conversational tester extraction passed');

    console.log('\nALL LLM JSON PARSER TESTS PASSED! ✅');
}

runTests().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});
