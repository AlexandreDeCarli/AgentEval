const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('esbuild');

const PROJECT_ROOT = path.join(__dirname, '..');

async function loadConfigurationTransfer() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenteval-config-transfer-'));
    const outfile = path.join(tempDir, 'configurationTransfer.cjs');

    await build({
        entryPoints: [path.join(PROJECT_ROOT, 'src/services/configurationTransfer.ts')],
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

function createApiConfig() {
    return {
        post_url: 'https://target.example/send',
        get_url: 'https://target.example/history',
        auth_header: 'Bearer env-token',
        payload_template: '{"text":"{{message}}"}',
        response_path: 'data.messages',
        polling_interval: 1500,
        max_timeout: 45,
    };
}

function createProject() {
    return {
        id: 'project-1',
        name: 'Commerce Bot',
        description: 'Customer support bot',
        documentation: 'Internal docs',
        target_provider: 'http',
        target_gemini_model: 'gemini-2.5-flash',
        system_prompts: [
            {
                id: 'prompt-1',
                name: 'Support Prompt',
                content: 'Be helpful.',
            },
        ],
        environments: [
            {
                id: 'env-1',
                name: 'Staging',
                api_config: createApiConfig(),
            },
        ],
    };
}

function createMission() {
    return {
        id: 'mission-1',
        project_id: 'project-1',
        environment_id: 'env-1',
        system_prompt_id: 'prompt-1',
        target_provider: 'http',
        target_gemini_model: 'gemini-2.5-flash',
        titulo: 'Return flow',
        target_system_prompt: 'Be helpful.',
        tester_persona: 'A direct customer.',
        mission_goal: 'Validate return eligibility.',
        variables: {
            order_id: ['ORD-1'],
        },
        max_turns: 5,
        api_config: createApiConfig(),
        evaluation_criteria: [
            {
                id: 'criterion-1',
                name: 'Resolution',
                description: 'The bot resolves the request.',
            },
        ],
    };
}

async function main() {
    const { module: transfer, cleanup } = await loadConfigurationTransfer();

    try {
        const project = createProject();
        const mission = createMission();
        const exported = transfer.createConfigurationExport({
            projects: [project],
            missions: [mission],
            settings: {
                geminiApiKey: 'AIza-secret',
                evaluatorModel: 'gemini-3.5-flash',
            },
        });

        assert.equal(exported.schema, 'agenteval.configuration-export');
        assert.equal(exported.version, 1);
        assert.deepEqual(exported.data.projects, [project]);
        assert.deepEqual(exported.data.missions, [mission]);
        assert.deepEqual(exported.data.settings, {
            geminiApiKey: 'AIza-secret',
            evaluatorModel: 'gemini-3.5-flash',
        });
        assert.ok(!('runs' in exported.data));
        assert.ok(!('testRuns' in exported.data));

        const parsed = transfer.parseConfigurationExport(JSON.stringify({
            ...exported,
            data: {
                ...exported.data,
                runs: [{ id: 'run-1' }],
            },
        }));

        assert.deepEqual(parsed.projects, [project]);
        assert.deepEqual(parsed.missions, [mission]);
        assert.deepEqual(parsed.settings, {
            geminiApiKey: 'AIza-secret',
            evaluatorModel: 'gemini-3.5-flash',
        });

        assert.throws(
            () => transfer.parseConfigurationExport(JSON.stringify([mission])),
            /AgentEval configuration export/
        );

        assert.throws(
            () => transfer.parseConfigurationExport(JSON.stringify({
                schema: 'agenteval.configuration-export',
                version: 1,
                data: {
                    projects: [project],
                    settings: { geminiApiKey: '', evaluatorModel: 'gemini-3.5-flash' },
                },
            })),
            /missions/
        );
    } finally {
        cleanup();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
