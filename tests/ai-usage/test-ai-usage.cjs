const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('esbuild');

const PROJECT_ROOT = path.join(__dirname, '../..');

const assertClose = (actual, expected) => {
    assert.ok(Math.abs(actual - expected) < 1e-12, `Expected ${actual} to be close to ${expected}`);
};

async function loadModule(relativePath) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenteval-ai-usage-'));
    const outfile = path.join(tempDir, 'module.cjs');

    await build({
        entryPoints: [path.join(PROJECT_ROOT, relativePath)],
        outfile,
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: ['node20'],
        logLevel: 'silent',
        define: {
            'import.meta.env.DEV': 'false',
        },
    });

    return {
        module: require(outfile),
        cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
    };
}

function measurement(overrides = {}) {
    return {
        requestedModel: 'gemini-2.5-flash',
        resolvedModel: 'gemini-2.5-flash',
        responseId: 'response-1',
        promptTokens: 1_000_000,
        candidateTokens: 100_000,
        thinkingTokens: 50_000,
        cachedTokens: 0,
        totalTokens: 1_150_000,
        ...overrides,
    };
}

function event(overrides = {}) {
    return {
        id: crypto.randomUUID(),
        occurredAt: new Date(2026, 6, 10, 10, 0, 0).getTime(),
        routine: 'tester_conversation',
        requestedModel: 'gemini-2.5-flash',
        resolvedModel: 'gemini-2.5-flash',
        responseId: crypto.randomUUID(),
        projectId: 'project-1',
        missionId: 'mission-1',
        runId: 'run-1',
        inputTokens: 100,
        candidateTokens: 40,
        thinkingTokens: 10,
        outputTokens: 50,
        cachedInputTokens: 0,
        totalTokens: 150,
        pricingStatus: 'priced',
        estimatedInputCostUsd: 0.001,
        estimatedOutputCostUsd: 0.002,
        estimatedCostUsd: 0.003,
        pricingSnapshot: {
            pricingVersion: 'gemini-standard-2026-07-10',
            pricingDate: '2026-07-10',
            currency: 'USD',
            inputPerMillionUsd: 0.3,
            outputPerMillionUsd: 2.5,
            source: 'https://ai.google.dev/gemini-api/docs/pricing',
        },
        ...overrides,
    };
}

async function testPricing() {
    const loaded = await loadModule('src/services/aiPricing.ts');
    try {
        const { calculateAiUsageCost, createAiUsageEvent } = loaded.module;

        const flash = calculateAiUsageCost(measurement());
        assert.equal(flash.status, 'priced');
        assert.equal(flash.outputTokens, 150_000);
        assert.equal(flash.inputCostUsd, 0.3);
        assert.equal(flash.outputCostUsd, 0.375);
        assert.equal(flash.totalCostUsd, 0.675);
        assert.equal(flash.snapshot.pricingVersion, 'gemini-standard-2026-07-10');
        assert.equal(flash.snapshot.pricingDate, '2026-07-10');

        const proShort = calculateAiUsageCost(measurement({
            resolvedModel: 'gemini-2.5-pro',
            promptTokens: 200_000,
            candidateTokens: 10_000,
            thinkingTokens: 0,
        }));
        assert.equal(proShort.snapshot.inputPerMillionUsd, 1.25);
        assert.equal(proShort.snapshot.outputPerMillionUsd, 10);

        const proLong = calculateAiUsageCost(measurement({
            resolvedModel: 'models/gemini-2.5-pro-001',
            promptTokens: 200_001,
            candidateTokens: 10_000,
            thinkingTokens: 5_000,
        }));
        assert.equal(proLong.snapshot.inputPerMillionUsd, 2.5);
        assert.equal(proLong.snapshot.outputPerMillionUsd, 15);

        const aliasResolved = calculateAiUsageCost(measurement({
            requestedModel: 'gemini-flash-latest',
            resolvedModel: 'models/gemini-3.5-flash-001',
        }));
        assert.equal(aliasResolved.snapshot.inputPerMillionUsd, 1.5);
        assert.equal(aliasResolved.snapshot.outputPerMillionUsd, 9);

        const unknown = calculateAiUsageCost(measurement({ resolvedModel: 'gemini-future' }));
        assert.equal(unknown.status, 'unpriced');
        assert.equal(unknown.totalCostUsd, null);

        const cached = calculateAiUsageCost(measurement({ cachedTokens: 10 }));
        assert.equal(cached.status, 'unpriced_cache');
        assert.equal(cached.totalCostUsd, null);

        const created = createAiUsageEvent(
            { routine: 'evaluation', projectId: 'project-1', missionId: 'mission-1', runId: 'run-1' },
            measurement({ responseId: 'response-created' }),
            1234
        );
        assert.equal(created.occurredAt, 1234);
        assert.equal(created.outputTokens, 150_000);
        assert.equal(created.routine, 'evaluation');
        assert.equal(created.estimatedCostUsd, 0.675);
    } finally {
        loaded.cleanup();
    }
}

async function testAnalytics() {
    const loaded = await loadModule('src/features/settings/aiUsageAnalytics.ts');
    try {
        const {
            buildCostBuckets,
            filterUsageByPeriod,
            summarizeAiUsage,
            summarizeRunUsage,
        } = loaded.module;
        const now = new Date(2026, 6, 10, 12, 0, 0).getTime();
        const recent = event({ occurredAt: now - 30 * 60 * 1000 });
        const evaluation = event({
            occurredAt: now - 20 * 60 * 1000,
            routine: 'evaluation',
            estimatedCostUsd: 0.01,
            estimatedInputCostUsd: 0.004,
            estimatedOutputCostUsd: 0.006,
        });
        const old = event({ occurredAt: now - 8 * 24 * 60 * 60 * 1000, runId: 'run-old' });
        const unpriced = event({
            occurredAt: now - 10 * 60 * 1000,
            pricingStatus: 'unpriced',
            estimatedInputCostUsd: null,
            estimatedOutputCostUsd: null,
            estimatedCostUsd: null,
            pricingSnapshot: null,
        });

        assert.deepEqual(filterUsageByPeriod([recent, evaluation, old], '7d', now), [recent, evaluation]);
        const allEvents = [recent, evaluation, old];
        const allResult = filterUsageByPeriod(allEvents, 'all', now);
        assert.deepEqual(allResult, allEvents);
        assert.notEqual(allResult, allEvents, 'All-period filtering must not expose the store array to sorting mutations');

        const summary = summarizeAiUsage([recent, evaluation, unpriced]);
        assert.equal(summary.calls, 3);
        assert.equal(summary.inputTokens, 300);
        assert.equal(summary.outputTokens, 150);
        assertClose(summary.estimatedCostUsd, 0.013);
        assert.equal(summary.unpricedCalls, 1);

        const runSummary = summarizeRunUsage([recent, evaluation, old], 'run-1');
        assert.equal(runSummary.conversationCostUsd, 0.003);
        assert.equal(runSummary.evaluationCostUsd, 0.01);
        assertClose(runSummary.totalCostUsd, 0.013);

        const hourlyBuckets = buildCostBuckets([recent, evaluation], '24h', now);
        assert.equal(hourlyBuckets.length, 24);
        assertClose(hourlyBuckets.reduce((sum, bucket) => sum + bucket.totalCostUsd, 0), 0.013);

        const monthlyBuckets = buildCostBuckets([recent, old], 'all', now);
        assert.ok(monthlyBuckets.length >= 1);
        assertClose(monthlyBuckets.reduce((sum, bucket) => sum + bucket.totalCostUsd, 0), 0.006);

        const sevenDayBuckets = buildCostBuckets([recent, evaluation, old], '7d', now);
        assert.equal(sevenDayBuckets.length, 7);
        assertClose(sevenDayBuckets.reduce((sum, bucket) => sum + bucket.costs.tester_conversation, 0), 0.003);
        assertClose(sevenDayBuckets.reduce((sum, bucket) => sum + bucket.costs.evaluation, 0), 0.01);

        const thirtyDayBuckets = buildCostBuckets([recent, old], '30d', now);
        assert.equal(thirtyDayBuckets.length, 30);
        assertClose(thirtyDayBuckets.reduce((sum, bucket) => sum + bucket.totalCostUsd, 0), 0.006);

        const localDay = new Date(sevenDayBuckets.at(-1).startAt);
        assert.equal(localDay.getHours(), 0, 'Daily buckets must start at local midnight');

        const sevenDayStart = sevenDayBuckets[0].startAt;
        const oldestDayEvent = event({ occurredAt: sevenDayStart + 30 * 60 * 1000 });
        const alignedEvents = filterUsageByPeriod([oldestDayEvent], '7d', now);
        assert.equal(alignedEvents.length, 1, 'Summary filtering must use the same boundary as chart buckets');
        assertClose(
            buildCostBuckets([oldestDayEvent], '7d', now).reduce((sum, bucket) => sum + bucket.totalCostUsd, 0),
            summarizeAiUsage(alignedEvents).estimatedCostUsd
        );
        const beforeOldestBucket = event({ occurredAt: sevenDayStart - 30 * 60 * 1000 });
        assert.equal(
            filterUsageByPeriod([beforeOldestBucket], '7d', now).length,
            0,
            'Summary filtering must exclude events that have no chart bucket'
        );

        const largeHistory = Array.from({ length: 70_000 }, (_, index) =>
            event({ occurredAt: now - index, responseId: `large-${index}` })
        );
        assert.doesNotThrow(() => buildCostBuckets(largeHistory, 'all', now));
    } finally {
        loaded.cleanup();
    }
}

async function testGeminiClient() {
    const loaded = await loadModule('src/services/geminiClient.ts');
    const originalFetch = global.fetch;
    try {
        const { requestGeminiGenerateContent } = loaded.module;
        const captured = [];
        global.fetch = async () => new Response(JSON.stringify({
            candidates: [{ content: { parts: [{ text: '{invalid-json' }] } }],
            usageMetadata: {
                promptTokenCount: 120,
                candidatesTokenCount: 30,
                thoughtsTokenCount: 5,
                totalTokenCount: 155,
            },
            modelVersion: 'gemini-2.5-flash-001',
            responseId: 'response-client',
        }), { status: 200 });

        const result = await requestGeminiGenerateContent({
            apiKey: 'test-key',
            model: 'gemini-2.5-flash',
            requestBody: { contents: [] },
            onUsage: (usage) => captured.push(usage),
        });

        assert.equal(result.ok, true);
        assert.equal(captured.length, 1);
        assert.equal(captured[0].resolvedModel, 'gemini-2.5-flash-001');
        assert.equal(captured[0].thinkingTokens, 5);

        global.fetch = async () => new Response(JSON.stringify({ candidates: [] }), { status: 200 });
        await requestGeminiGenerateContent({
            apiKey: 'test-key',
            model: 'gemini-2.5-flash',
            requestBody: { contents: [] },
            onUsage: (usage) => captured.push(usage),
        });
        assert.equal(captured.length, 1);
    } finally {
        global.fetch = originalFetch;
        loaded.cleanup();
    }
}

async function testHighLevelUsageCallbacks() {
    const llmLoaded = await loadModule('src/services/llm.ts');
    const generatorLoaded = await loadModule('src/services/missionGenerator.ts');
    const originalFetch = global.fetch;

    try {
        const capturedTesterUsage = [];
        global.fetch = async () => new Response(JSON.stringify({
            candidates: [{ content: { parts: [{ text: '{invalid-json' }] } }],
            usageMetadata: {
                promptTokenCount: 80,
                candidatesTokenCount: 20,
                totalTokenCount: 100,
            },
            modelVersion: 'gemini-2.5-flash-001',
            responseId: 'tester-invalid-json',
        }), { status: 200 });

        await assert.rejects(
            () => llmLoaded.module.generateTesterMessage(
                'test-key',
                'Helpful tester',
                'Complete checkout',
                [],
                (usage) => capturedTesterUsage.push(usage)
            ),
            /Failed to parse Gemini JSON output/
        );
        assert.equal(capturedTesterUsage.length, 1);

        const capturedGeneratorUsage = [];
        global.fetch = async () => new Response(JSON.stringify({
            candidates: [{ content: { parts: [{ text: JSON.stringify([{
                titulo: '(Gerado por IA) Checkout',
                system_prompt_id: 'prompt-1',
                environment_id: '',
                tester_persona: 'Shopper',
                mission_goal: 'Finish checkout',
                variables: '{}',
                max_turns: 3,
                evaluation_criteria: [],
            }]) }] } }],
            usageMetadata: {
                promptTokenCount: 200,
                candidatesTokenCount: 100,
                thoughtsTokenCount: 10,
                totalTokenCount: 310,
            },
            modelVersion: 'gemini-2.5-pro-001',
            responseId: 'mission-generation-1',
        }), { status: 200 });

        const generated = await generatorLoaded.module.generateMissionsFromAI(
            'test-key',
            {
                id: 'project-1',
                name: 'Shop',
                description: '',
                documentation: '',
                system_prompts: [{ id: 'prompt-1', name: 'Prompt', content: 'Help shoppers.' }],
                environments: [],
            },
            undefined,
            1,
            ['prompt-1'],
            (usage) => capturedGeneratorUsage.push(usage)
        );
        assert.equal(generated.length, 1);
        assert.equal(capturedGeneratorUsage.length, 1);
        assert.equal(capturedGeneratorUsage[0].responseId, 'mission-generation-1');
    } finally {
        global.fetch = originalFetch;
        llmLoaded.cleanup();
        generatorLoaded.cleanup();
    }
}

async function testUsageStore() {
    const loaded = await loadModule('src/store/useAiUsageStore.ts');
    try {
        const storedEvent = event({ id: 'stored-event', responseId: 'stored-response' });
        const appended = [];
        let clearCalls = 0;
        const repository = {
            load: async () => [storedEvent],
            append: async (value) => appended.push(value),
            clear: async () => { clearCalls += 1; },
        };
        const { createAiUsageStore } = loaded.module;
        const useAiUsageStore = createAiUsageStore(repository);
        await useAiUsageStore.getState().hydrateUsage();
        assert.deepEqual(useAiUsageStore.getState().events, [storedEvent]);

        const record = useAiUsageStore.getState().recordMeasurement;
        record({ routine: 'tester_conversation', runId: 'run-1' }, measurement());
        record({ routine: 'tester_conversation', runId: 'run-1' }, measurement());
        await new Promise((resolve) => setTimeout(resolve, 0));
        assert.equal(useAiUsageStore.getState().events.length, 2);
        assert.equal(appended.length, 1, 'Each new event must be appended without rewriting existing history');

        await useAiUsageStore.getState().clearUsage();
        assert.equal(useAiUsageStore.getState().events.length, 0);
        assert.equal(clearCalls, 1);
    } finally {
        loaded.cleanup();
    }
}

async function main() {
    await testPricing();
    await testAnalytics();
    await testGeminiClient();
    await testHighLevelUsageCallbacks();
    await testUsageStore();
    console.log('PASS AI usage pricing, analytics, Gemini capture, and persistence');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
