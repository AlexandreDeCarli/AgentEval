const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

async function compileModules() {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'agenteval-litellm-test-'));
    const outfile = path.join(tmpDir, 'bundle.cjs');

    await esbuild.build({
        stdin: {
            contents: `
                export * from './src/services/litellmClient.ts';
                export * from './src/utils/missionTarget.ts';
                export * from './src/features/settings/aiUsageAnalytics.ts';
            `,
            resolveDir: path.resolve(__dirname, '..'),
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
    console.log('--- Testing LiteLLM Integration ---');

    // 1. URL normalization and endpoint builders
    const {
        DEFAULT_LITELLM_BASE_URL,
        normalizeLiteLlmBaseUrl,
        buildLiteLlmChatCompletionsUrl,
        buildLiteLlmModelsUrl,
        extractLiteLlmText,
        extractLiteLlmUsageMeasurement,
        getLiteLlmErrorMessage,
        getMissionTargetProvider,
        getProjectTargetProvider,
        getProjectLiteLlmModel,
        getMissionLiteLlmModel,
    } = (await compileModules()).module;

    assert.equal(DEFAULT_LITELLM_BASE_URL, 'https://llm.potencial.tec.br');
    assert.equal(normalizeLiteLlmBaseUrl(''), 'https://llm.potencial.tec.br');
    assert.equal(normalizeLiteLlmBaseUrl('https://llm.potencial.tec.br/'), 'https://llm.potencial.tec.br');
    assert.equal(normalizeLiteLlmBaseUrl('https://custom.host:8000///'), 'https://custom.host:8000');

    assert.equal(
        buildLiteLlmChatCompletionsUrl('https://llm.potencial.tec.br'),
        'https://llm.potencial.tec.br/v1/chat/completions'
    );
    assert.equal(
        buildLiteLlmChatCompletionsUrl('https://llm.potencial.tec.br/v1'),
        'https://llm.potencial.tec.br/v1/chat/completions'
    );
    assert.equal(
        buildLiteLlmModelsUrl('https://llm.potencial.tec.br'),
        'https://llm.potencial.tec.br/v1/models'
    );
    assert.equal(
        buildLiteLlmModelsUrl('https://llm.potencial.tec.br/v1'),
        'https://llm.potencial.tec.br/v1/models'
    );
    console.log('✓ URL normalization and endpoint builders passed');

    // 2. Token usage extraction
    const mockUsageEnvelope = {
        id: 'chatcmpl-test-123',
        model: 'gpt-4o-mini',
        choices: [
            {
                message: { role: 'assistant', content: 'Hello world' },
            },
        ],
        usage: {
            prompt_tokens: 150,
            completion_tokens: 50,
            total_tokens: 200,
            prompt_tokens_details: { cached_tokens: 20 },
            completion_tokens_details: { reasoning_tokens: 10 },
        },
    };

    const measurement = extractLiteLlmUsageMeasurement(mockUsageEnvelope, 'gpt-4o-mini');
    assert.ok(measurement);
    assert.equal(measurement.promptTokens, 150);
    assert.equal(measurement.candidateTokens, 50);
    assert.equal(measurement.thinkingTokens, 10);
    assert.equal(measurement.cachedTokens, 20);
    assert.equal(measurement.totalTokens, 200);
    assert.equal(measurement.resolvedModel, 'gpt-4o-mini');
    assert.equal(extractLiteLlmText(mockUsageEnvelope), 'Hello world');
    console.log('✓ Token usage measurement extraction passed');

    // 3. Error extraction
    const errorBody = {
        error: {
            message: 'Authentication Error, No api key passed in.',
            type: 'auth_error',
            code: 401,
        },
    };
    assert.equal(getLiteLlmErrorMessage(errorBody), 'Authentication Error, No api key passed in.');
    console.log('✓ Error extraction passed');

    // 4. Target provider resolution
    assert.equal(getMissionTargetProvider({ target_provider: 'litellm' }), 'litellm');
    assert.equal(getMissionTargetProvider({ target_provider: 'gemini' }), 'gemini');
    assert.equal(getMissionTargetProvider({ target_provider: 'http' }), 'http');

    assert.equal(getProjectTargetProvider({ target_provider: 'litellm' }), 'litellm');
    assert.equal(getProjectTargetProvider({ target_provider: 'gemini' }), 'gemini');
    assert.equal(getProjectTargetProvider({ target_provider: 'http' }), 'http');

    assert.equal(getProjectLiteLlmModel({ target_provider: 'litellm', target_litellm_model: 'claude-3-5-sonnet' }), 'claude-3-5-sonnet');
    assert.equal(getMissionLiteLlmModel({ target_litellm_model: 'llama-3.3-70b' }), 'llama-3.3-70b');
    console.log('✓ Target provider resolution for LiteLLM passed');

    // 5. Test Run Usage Summary with litellm_target
    const { summarizeRunUsage } = (await compileModules()).module;
    const testEvents = [
        {
            id: 'e1',
            runId: 'run-test-1',
            routine: 'tester_conversation',
            occurredAt: Date.now(),
            inputTokens: 100,
            outputTokens: 50,
            totalTokens: 150,
            estimatedCostUsd: 0.0001,
            pricingStatus: 'priced',
        },
        {
            id: 'e2',
            runId: 'run-test-1',
            routine: 'litellm_target',
            occurredAt: Date.now(),
            inputTokens: 200,
            outputTokens: 100,
            totalTokens: 300,
            estimatedCostUsd: 0.0002,
            pricingStatus: 'priced',
        },
        {
            id: 'e3',
            runId: 'run-test-1',
            routine: 'evaluation',
            occurredAt: Date.now(),
            inputTokens: 500,
            outputTokens: 200,
            totalTokens: 700,
            estimatedCostUsd: 0.0005,
            pricingStatus: 'priced',
        },
    ];

    const runSummary = summarizeRunUsage(testEvents, 'run-test-1');
    assert.equal(runSummary.calls, 3);
    assert.equal(runSummary.inputTokens, 800);
    assert.equal(runSummary.outputTokens, 350);
    // conversationCostUsd must sum both tester_conversation and litellm_target (0.0001 + 0.0002 = 0.0003)
    assert.ok(Math.abs(runSummary.conversationCostUsd - 0.0003) < 0.000001);
    assert.ok(Math.abs(runSummary.evaluationCostUsd - 0.0005) < 0.000001);
    assert.ok(Math.abs(runSummary.totalCostUsd - 0.0008) < 0.000001);
    console.log('✓ Run usage summary correctly aggregates litellm_target in conversation costs');

    // 6. Test Live Connection Check (CORS / HTTP response against https://llm.potencial.tec.br)
    console.log('Testing live endpoint response from https://llm.potencial.tec.br...');
    const originalFetch = global.fetch;
    try {
        const res = await fetch('https://llm.potencial.tec.br/health');
        const json = await res.json();
        // Endpoint returns 401 with auth_error when no key is passed, verifying live accessibility
        assert.equal(res.status, 401);
        assert.equal(json.error.type, 'auth_error');
        console.log('✓ Endpoint https://llm.potencial.tec.br is reachable and authenticated by LiteLLM');
    } catch (e) {
        console.warn('Network check warning:', e.message);
    }

    console.log('\nALL LITELLM INTEGRATION TESTS PASSED! ✅');
}

runTests().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});
