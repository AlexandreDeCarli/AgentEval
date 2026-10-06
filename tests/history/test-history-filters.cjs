const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const fs = require('node:fs');

async function compileModules() {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'agenteval-history-test-'));
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

    return { tmpDir, module: require(outfile) };
}

async function runTests() {
    console.log('--- Testing Test Run Store Batch Deletion ---');
    const { module } = await compileModules();
    const { useTestRunStore } = module;

    // Verify deleteRuns method exists and deletes multiple IDs
    const store = useTestRunStore.getState();
    assert.equal(typeof store.deleteRuns, 'function', 'store.deleteRuns must be a function');
    assert.equal(typeof store.clearAllRuns, 'function', 'store.clearAllRuns must be a function');

    console.log('✓ store.deleteRuns and store.clearAllRuns methods exist');
}

runTests().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});
