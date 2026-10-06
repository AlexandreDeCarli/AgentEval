const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const esbuild = require('esbuild');
const fs = require('node:fs');
const { IDBFactory } = require('fake-indexeddb');

global.window = { indexedDB: new IDBFactory() };

async function compileModules() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenteval-history-test-'));
    const outfile = path.join(tmpDir, 'history-test.cjs');

    await esbuild.build({
        stdin: {
            contents: `
                export * from './src/features/test-history/testRunFilters.ts';
                export { useTestRunStore } from './src/store/useTestRunStore.ts';
            `,
            resolveDir: path.resolve(__dirname, '../..'),
            loader: 'ts',
        },
        bundle: true,
        platform: 'node',
        format: 'cjs',
        outfile,
    });

    return {
        tmpDir,
        module: require(outfile),
        cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }),
    };
}

async function runTests() {
    console.log('--- Testing Test Run Store Batch Deletion ---');
    const { module, cleanup } = await compileModules();

    try {
        const { useTestRunStore } = module;

        // Verify deleteRuns method exists and deletes multiple IDs
        const store = useTestRunStore.getState();
        assert.equal(typeof store.deleteRuns, 'function', 'store.deleteRuns must be a function');
        assert.equal(typeof store.clearAllRuns, 'function', 'store.clearAllRuns must be a function');

        console.log('✓ store.deleteRuns and store.clearAllRuns methods exist');

        // Functional test for deleteRuns and clearAllRuns
        store.clearAllRuns();
        assert.equal(useTestRunStore.getState().runs.length, 0, 'runs must be empty after clearAllRuns');

        store.addRun({
            id: 'r1',
            mission_id: 'm1',
            status: 'success',
            chat_history: [],
            evaluation: null,
            resolved_variables: {},
            debug_logs: [],
            created_at: 1,
            updated_at: 1,
        });
        store.addRun({
            id: 'r2',
            mission_id: 'm2',
            status: 'failed',
            chat_history: [],
            evaluation: null,
            resolved_variables: {},
            debug_logs: [],
            created_at: 2,
            updated_at: 2,
        });
        store.addRun({
            id: 'r3',
            mission_id: 'm3',
            status: 'success',
            chat_history: [],
            evaluation: null,
            resolved_variables: {},
            debug_logs: [],
            created_at: 3,
            updated_at: 3,
        });

        assert.equal(useTestRunStore.getState().runs.length, 3, 'runs should contain 3 items');

        useTestRunStore.getState().deleteRuns(['r1', 'r3']);
        const remainingRuns = useTestRunStore.getState().runs;
        assert.equal(remainingRuns.length, 1, 'runs should contain 1 item after deleteRuns');
        assert.equal(remainingRuns[0].id, 'r2', 'remaining run should be r2');

        useTestRunStore.getState().deleteRuns([]);
        assert.equal(useTestRunStore.getState().runs.length, 1, 'deleteRuns([]) should not modify runs');

        useTestRunStore.getState().clearAllRuns();
        assert.equal(useTestRunStore.getState().runs.length, 0, 'runs should be 0 after clearAllRuns');

        console.log('✓ functional tests for deleteRuns and clearAllRuns passed');
    } finally {
        cleanup();
    }
}

runTests().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});
