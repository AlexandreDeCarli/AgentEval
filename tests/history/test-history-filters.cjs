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

        console.log('--- Testing Test Run Filtering Functions ---');
        const {
            DEFAULT_TEST_RUN_FILTERS,
            filterTestRuns,
            getTestRunFilterOptions,
            reconcileSelectedRunIds
        } = module;

        const mockProjects = [
            { id: 'p1', name: 'Project Alpha', environments: [{ id: 'env1', name: 'Staging' }] },
            { id: 'p2', name: 'Project Beta', environments: [{ id: 'env2', name: 'Production' }] }
        ];

        const mockMissions = [
            { id: 'm1', project_id: 'p1', titulo: 'Login Flow', mission_goal: 'Test user authentication', environment_id: 'env1' },
            { id: 'm2', project_id: 'p1', titulo: 'Checkout Flow', mission_goal: 'Test payment gateway', environment_id: 'env1' },
            { id: 'm3', project_id: 'p2', titulo: 'Profile Update', mission_goal: 'Edit avatar and bio', environment_id: 'env2' }
        ];

        const mockRuns = [
            { id: 'r1', mission_id: 'm1', status: 'success', created_at: 1000 },
            { id: 'r2', mission_id: 'm1', status: 'failed', error: 'Network timeout during OTP', created_at: 2000 },
            { id: 'r3', mission_id: 'm2', status: 'success', created_at: 3000 },
            { id: 'r4', mission_id: 'm3', status: 'failed', created_at: 4000 }
        ];

        const missionMap = new Map(mockMissions.map(m => [m.id, m]));
        const projectMap = new Map(mockProjects.map(p => [p.id, p]));

        // 1. Default filters return all runs
        const allFiltered = filterTestRuns(mockRuns, DEFAULT_TEST_RUN_FILTERS, missionMap, projectMap);
        assert.equal(allFiltered.length, 4);

        // 2. Query filter on mission title
        const loginFiltered = filterTestRuns(mockRuns, { ...DEFAULT_TEST_RUN_FILTERS, query: 'login' }, missionMap, projectMap);
        assert.equal(loginFiltered.length, 2);

        // 3. Query filter on error text
        const errorFiltered = filterTestRuns(mockRuns, { ...DEFAULT_TEST_RUN_FILTERS, query: 'timeout' }, missionMap, projectMap);
        assert.equal(errorFiltered.length, 1);
        assert.equal(errorFiltered[0].id, 'r2');

        // 4. Project filter
        const p2Filtered = filterTestRuns(mockRuns, { ...DEFAULT_TEST_RUN_FILTERS, projectId: 'p2' }, missionMap, projectMap);
        assert.equal(p2Filtered.length, 1);
        assert.equal(p2Filtered[0].id, 'r4');

        // 5. Status filter
        const successFiltered = filterTestRuns(mockRuns, { ...DEFAULT_TEST_RUN_FILTERS, status: 'success' }, missionMap, projectMap);
        assert.equal(successFiltered.length, 2);

        // 6. Environment filter
        const env2Filtered = filterTestRuns(mockRuns, { ...DEFAULT_TEST_RUN_FILTERS, environmentId: 'env2' }, missionMap, projectMap);
        assert.equal(env2Filtered.length, 1);
        assert.equal(env2Filtered[0].id, 'r4');

        // 7. Combined filter
        const combinedFiltered = filterTestRuns(mockRuns, {
            query: '',
            projectId: 'p1',
            status: 'failed',
            environmentId: 'all'
        }, missionMap, projectMap);
        assert.equal(combinedFiltered.length, 1);
        assert.equal(combinedFiltered[0].id, 'r2');

        // 8. Reconcile selection
        const reconciled = reconcileSelectedRunIds(['r1', 'deleted_id', 'r3'], mockRuns);
        assert.deepEqual(reconciled, ['r1', 'r3']);

        // 9. Options extraction
        const options = getTestRunFilterOptions(mockProjects);
        assert.equal(options.projectOptions.length, 2);
        assert.equal(options.environmentOptions.length, 2);

        console.log('✓ All filter and reconciliation algorithms passed');
    } finally {
        cleanup();
    }
}

runTests().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});
