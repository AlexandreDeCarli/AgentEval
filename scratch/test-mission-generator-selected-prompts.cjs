const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('esbuild');

const PROJECT_ROOT = path.join(__dirname, '..');

async function loadMissionGenerator() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenteval-mission-generator-'));
    const outfile = path.join(tempDir, 'missionGenerator.cjs');

    await build({
        entryPoints: [path.join(PROJECT_ROOT, 'src/services/missionGenerator.ts')],
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

function createProject() {
    const api_config = {
        post_url: 'https://target.example/send',
        get_url: 'https://target.example/history',
        auth_header: '',
        payload_template: '{"message":"{{message}}"}',
        response_path: '',
        polling_interval: 2000,
        max_timeout: 30,
    };

    return {
        id: 'project-1',
        name: 'Commerce Bot',
        description: 'Customer support assistant.',
        documentation: 'Orders and returns documentation.',
        system_prompts: [
            {
                id: 'sp-orders',
                name: 'Orders',
                content: 'ORDERS_PROMPT_SHOULD_BE_EXCLUDED',
            },
            {
                id: 'sp-returns',
                name: 'Returns',
                content: 'RETURNS_PROMPT_SHOULD_BE_INCLUDED',
            },
        ],
        environments: [
            {
                id: 'env-dev',
                name: 'Dev',
                api_config,
            },
        ],
    };
}

async function main() {
    const { module: missionGenerator, cleanup } = await loadMissionGenerator();
    const project = createProject();
    let systemPromptSentToGemini = '';
    let fetchCalls = 0;

    global.fetch = async (_url, options) => {
        fetchCalls += 1;
        const requestBody = JSON.parse(options.body);
        systemPromptSentToGemini = requestBody.contents[0].parts[0].text;

        return {
            ok: true,
            status: 200,
            async json() {
                return {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    {
                                        text: JSON.stringify([
                                            {
                                                titulo: '(Gerado por IA) Return eligibility',
                                                system_prompt_id: 'sp-orders',
                                                environment_id: 'env-dev',
                                                tester_persona: 'Cliente testando devolucao.',
                                                mission_goal: 'Verificar fluxo de devolucao.',
                                                variables: JSON.stringify({
                                                    order_id: ['ORD-1', 'ORD-2'],
                                                }),
                                                max_turns: 5,
                                                evaluation_criteria: [
                                                    {
                                                        name: 'Eligibility',
                                                        description: 'Checks return eligibility.',
                                                    },
                                                ],
                                            },
                                        ]),
                                    },
                                ],
                            },
                        },
                    ],
                };
            },
        };
    };

    try {
        await assert.rejects(
            () =>
                missionGenerator.generateMissionsFromAI(
                    'test-api-key',
                    project,
                    undefined,
                    1,
                    []
                ),
            /Select at least one system prompt before generating missions/
        );
        assert.equal(fetchCalls, 0);

        const missions = await missionGenerator.generateMissionsFromAI(
            'test-api-key',
            project,
            undefined,
            1,
            ['sp-returns']
        );

        assert.match(systemPromptSentToGemini, /RETURNS_PROMPT_SHOULD_BE_INCLUDED/);
        assert.doesNotMatch(systemPromptSentToGemini, /ORDERS_PROMPT_SHOULD_BE_EXCLUDED/);
        assert.equal(missions[0].system_prompt_id, 'sp-returns');
        assert.equal(missions[0].target_system_prompt, 'RETURNS_PROMPT_SHOULD_BE_INCLUDED');
        assert.equal(fetchCalls, 1);
    } finally {
        cleanup();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
