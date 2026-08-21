const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('esbuild');

const PROJECT_ROOT = path.join(__dirname, '../..');

async function loadModule(relativePath) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenteval-models-test-'));
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

async function testGeminiModelsCatalog() {
    const loaded = await loadModule('src/config/geminiModels.ts');
    try {
        const {
            GEMINI_MODELS,
            getCombinedGeminiModels,
            getCombinedEvaluatorModels,
            getCombinedSuggestedTargetModels,
        } = loaded.module;

        const ids = GEMINI_MODELS.map((m) => m.id);
        assert.ok(ids.includes('gemini-3.7-flash'), 'Should include gemini-3.7-flash');
        assert.ok(ids.includes('gemini-3.6-flash'), 'Should include gemini-3.6-flash');
        assert.ok(ids.includes('gemini-3.5-flash'), 'Should include gemini-3.5-flash');
        assert.ok(ids.includes('gemini-3.5-flash-lite'), 'Should include gemini-3.5-flash-lite');
        assert.ok(ids.includes('gemini-3.1-pro-preview'), 'Should include gemini-3.1-pro-preview');
        assert.ok(ids.includes('gemini-3.1-flash-lite'), 'Should include gemini-3.1-flash-lite');
        assert.ok(ids.includes('gemini-2.5-pro'), 'Should include gemini-2.5-pro');
        assert.ok(ids.includes('gemini-2.5-flash'), 'Should include gemini-2.5-flash');
        assert.ok(ids.includes('gemini-2.5-flash-lite'), 'Should include gemini-2.5-flash-lite');

        const mockDiscovered = [
            {
                id: 'gemini-future-super',
                name: 'Gemini Future Super',
                isFreeTier: true,
                inputCostPaid: 'Custom',
                outputCostPaid: 'Custom',
                description: 'Future model',
                contextLimit: '2M tokens',
                standardRate: { inputPerMillionUsd: 0, outputPerMillionUsd: 0 },
            },
        ];

        const combined = getCombinedGeminiModels(mockDiscovered);
        assert.equal(combined.length, GEMINI_MODELS.length + 1);
        assert.ok(combined.some((m) => m.id === 'gemini-future-super'));

        const combinedEval = getCombinedEvaluatorModels(mockDiscovered);
        assert.ok(combinedEval.some((m) => m.id === 'gemini-future-super'));

        const combinedTargets = getCombinedSuggestedTargetModels(mockDiscovered);
        assert.ok(combinedTargets.includes('gemini-future-super'));
    } finally {
        loaded.cleanup();
    }
}

async function testFetchAvailableGeminiModels() {
    const loaded = await loadModule('src/services/geminiClient.ts');
    const originalFetch = global.fetch;

    try {
        const { fetchAvailableGeminiModels } = loaded.module;

        global.fetch = async (url, options) => {
            assert.ok(url.includes('/models'), 'Should query models endpoint');
            assert.equal(options.headers['x-goog-api-key'], 'test-api-key');

            return new Response(
                JSON.stringify({
                    models: [
                        {
                            name: 'models/gemini-2.5-flash',
                            displayName: 'Gemini 2.5 Flash',
                            description: 'Fast flash model',
                            inputTokenLimit: 1048576,
                            supportedGenerationMethods: ['generateContent', 'countTokens'],
                        },
                        {
                            name: 'models/gemini-3.7-flash',
                            displayName: 'Gemini 3.7 Flash',
                            description: 'Frontier reasoning',
                            inputTokenLimit: 1048576,
                            supportedGenerationMethods: ['generateContent'],
                        },
                        {
                            name: 'models/embedding-001',
                            displayName: 'Embedding Model',
                            description: 'Embeddings only',
                            supportedGenerationMethods: ['embedContent'],
                        },
                        {
                            name: 'models/gemini-experimental-2027',
                            displayName: 'Gemini Exp 2027',
                            description: 'Future test model',
                            inputTokenLimit: 2097152,
                            supportedGenerationMethods: ['generateContent'],
                        },
                    ],
                }),
                { status: 200 }
            );
        };

        const result = await fetchAvailableGeminiModels('test-api-key');
        assert.equal(result.length, 3, 'Should filter out models that do not support generateContent');
        const ids = result.map((m) => m.id);
        assert.ok(ids.includes('gemini-2.5-flash'));
        assert.ok(ids.includes('gemini-3.7-flash'));
        assert.ok(ids.includes('gemini-experimental-2027'));
        assert.ok(!ids.includes('embedding-001'));
    } finally {
        global.fetch = originalFetch;
        loaded.cleanup();
    }
}

async function testMissionGeneratorFallback() {
    const loaded = await loadModule('src/services/missionGenerator.ts');
    const originalFetch = global.fetch;

    try {
        const { generateMissionsFromAI } = loaded.module;
        const requestedModels = [];

        global.fetch = async (url) => {
            const match = url.match(/\/models\/([^:]+):generateContent/);
            const model = match ? match[1] : '';
            requestedModels.push(model);

            if (model === 'gemini-3.7-flash') {
                return new Response(JSON.stringify({ error: { message: 'Rate limit on 3.7' } }), { status: 429 });
            }

            if (model === 'gemini-3.6-flash') {
                return new Response(
                    JSON.stringify({
                        candidates: [
                            {
                                content: {
                                    parts: [
                                        {
                                            text: JSON.stringify([
                                                {
                                                    titulo: '(Gerado por IA) Teste 1',
                                                    system_prompt_id: 'sp-1',
                                                    environment_id: '',
                                                    tester_persona: 'Cliente',
                                                    mission_goal: 'Verificar suporte',
                                                    variables: '{}',
                                                    max_turns: 5,
                                                    evaluation_criteria: [],
                                                },
                                            ]),
                                        },
                                    ],
                                },
                            },
                        ],
                    }),
                    { status: 200 }
                );
            }

            return new Response('Not found', { status: 404 });
        };

        const result = await generateMissionsFromAI(
            'test-key',
            {
                id: 'p-1',
                name: 'Proj',
                description: '',
                documentation: '',
                system_prompts: [{ id: 'sp-1', name: 'Prompt', content: 'Test prompt' }],
                environments: [],
            },
            undefined,
            1,
            ['sp-1']
        );

        assert.equal(result.length, 1);
        assert.deepEqual(requestedModels, ['gemini-3.7-flash', 'gemini-3.6-flash']);
    } finally {
        global.fetch = originalFetch;
        loaded.cleanup();
    }
}

async function testTesterMessageFallback() {
    const loaded = await loadModule('src/services/llm.ts');
    const originalFetch = global.fetch;

    try {
        const { generateTesterMessage } = loaded.module;
        const requestedModels = [];

        global.fetch = async (url) => {
            const match = url.match(/\/models\/([^:]+):generateContent/);
            const model = match ? match[1] : '';
            requestedModels.push(model);

            if (model === 'gemini-3.5-flash-lite') {
                return new Response('500 Server Error', { status: 500 });
            }
            if (model === 'gemini-3.1-flash-lite') {
                return new Response('429 Quota Exceeded', { status: 429 });
            }
            if (model === 'gemini-2.5-flash') {
                return new Response(
                    JSON.stringify({
                        candidates: [
                            {
                                content: {
                                    parts: [
                                        {
                                            text: JSON.stringify({
                                                message: 'Olá, preciso de ajuda',
                                                missionCompleted: false,
                                            }),
                                        },
                                    ],
                                },
                            },
                        ],
                    }),
                    { status: 200 }
                );
            }

            return new Response('Error', { status: 500 });
        };

        const result = await generateTesterMessage('test-key', 'Persona', 'Goal', []);
        assert.equal(result.message, 'Olá, preciso de ajuda');
        assert.equal(result.missionCompleted, false);
        assert.deepEqual(requestedModels, [
            'gemini-3.5-flash-lite',
            'gemini-3.1-flash-lite',
            'gemini-2.5-flash',
        ]);
    } finally {
        global.fetch = originalFetch;
        loaded.cleanup();
    }
}

async function testEvaluationFallback() {
    const loaded = await loadModule('src/services/llm.ts');
    const originalFetch = global.fetch;

    try {
        const { generateEvaluation } = loaded.module;
        const requestedModels = [];

        global.fetch = async (url) => {
            const match = url.match(/\/models\/([^:]+):generateContent/);
            const model = match ? match[1] : '';
            requestedModels.push(model);

            if (model === 'gemini-3.5-flash-lite') {
                return new Response('503 Service Unavailable', { status: 503 });
            }
            if (model === 'gemini-3.1-flash-lite') {
                return new Response(
                    JSON.stringify({
                        candidates: [
                            {
                                content: {
                                    parts: [
                                        {
                                            text: JSON.stringify({
                                                overall_score: 95,
                                                summary: 'Excelente conversa',
                                                criteria_scores: [],
                                                prompt_improvements: [],
                                                metrics: {
                                                    avg_time_to_first_response_ms: 200,
                                                    avg_time_to_complete_response_ms: 500,
                                                },
                                            }),
                                        },
                                    ],
                                },
                            },
                        ],
                    }),
                    { status: 200 }
                );
            }

            return new Response('Error', { status: 500 });
        };

        const result = await generateEvaluation(
            'test-key',
            [],
            'System Prompt',
            'Goal',
            5,
            [],
            { avg_time_to_first_response_ms: 100, avg_time_to_complete_response_ms: 300 }
        );

        assert.equal(result.overall_score, 95);
        assert.equal(result.summary, 'Excelente conversa');
        assert.deepEqual(requestedModels, [
            'gemini-3.5-flash-lite',
            'gemini-3.1-flash-lite',
        ]);
    } finally {
        global.fetch = originalFetch;
        loaded.cleanup();
    }
}

async function main() {
    console.log('Testing Gemini Models Catalog...');
    await testGeminiModelsCatalog();
    console.log('Testing Fetch Available Gemini Models API...');
    await testFetchAvailableGeminiModels();
    console.log('Testing Mission Generator Fallback (3.7 -> 3.6)...');
    await testMissionGeneratorFallback();
    console.log('Testing Tester Message Fallback (3.5-lite -> 3.1-lite -> 2.5-flash)...');
    await testTesterMessageFallback();
    console.log('Testing Evaluation Fallback (3.5-lite -> 3.1-lite -> 2.5-flash)...');
    await testEvaluationFallback();
    console.log('ALL MODEL AND FALLBACK TESTS PASSED ✅');
}

main().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});
