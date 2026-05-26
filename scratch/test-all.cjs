const { fork, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

const PORT = 5173;
const TESTS_DIR = __dirname;
const PROJECT_ROOT = path.join(__dirname, '..');

// List of E2E tests to run sequentially (excluding backups or utility files)
const E2E_TESTS = [
    'test-welcome-modal.cjs',
    'test-onboarding-resume.cjs',
    'test-project-tour.cjs',
    'test-navigation.cjs',
    'test-ui.cjs'
];

function isPortOpen(port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const onError = () => {
            socket.destroy();
            resolve(false);
        };
        socket.setTimeout(800);
        socket.on('error', onError);
        socket.on('timeout', onError);
        socket.connect(port, 'localhost', () => {
            socket.end();
            resolve(true);
        });
    });
}

async function waitForPort(port, timeoutMs = 12000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (await isPortOpen(port)) {
            return true;
        }
        await new Promise(r => setTimeout(r, 250));
    }
    return false;
}

function runSingleTest(testFile) {
    return new Promise((resolve) => {
        const testPath = path.join(TESTS_DIR, testFile);
        console.log(`\n======================================================================`);
        console.log(`🚀 RUNNING TEST: ${testFile}`);
        console.log(`======================================================================`);

        // Use fork to execute the Node script in a separate child process, inheriting stdio
        const child = fork(testPath, [], {
            cwd: PROJECT_ROOT,
            stdio: 'inherit'
        });

        child.on('close', (code) => {
            resolve(code === 0);
        });

        child.on('error', (err) => {
            console.error(`❌ Error spawning ${testFile}:`, err);
            resolve(false);
        });
    });
}

async function startOrchestrator() {
    console.log(`\n==================================================`);
    console.log(`   🤖  AgentEval System-Wide Test Orchestrator  🤖`);
    console.log(`==================================================`);
    console.log(`📅 Date: ${new Date().toLocaleString()}`);
    console.log(`📁 Project Root: ${PROJECT_ROOT}`);
    console.log(`📦 Found ${E2E_TESTS.length} system E2E tests to execute sequentially.\n`);

    // 1. Check if the Vite dev server is already running
    const portAlreadyActive = await isPortOpen(PORT);
    let devServerProcess = null;

    if (!portAlreadyActive) {
        console.log(`🔌 Port ${PORT} is closed. Automatically spawning Vite dev server...`);
        devServerProcess = exec('npm run dev', { cwd: PROJECT_ROOT });

        devServerProcess.stderr.on('data', (data) => {
            console.error(`[Vite Server Error] ${data.trim()}`);
        });

        // Wait for the dev server to start up and listen on the port
        console.log(`⏳ Waiting for server to boot on port ${PORT}...`);
        const isReady = await waitForPort(PORT);
        if (!isReady) {
            console.error(`❌ Timeout: Vite server failed to boot on port ${PORT} within 12 seconds.`);
            process.exit(1);
        }
        console.log(`✨ Vite dev server is online!`);
    } else {
        console.log(`✨ Vite dev server is already active on port ${PORT}. Reusing existing instance.`);
    }

    // Helper function to clean up the dev server on exit
    const cleanup = () => {
        if (devServerProcess) {
            console.log(`\n🛑 Stopping the spawned Vite dev server...`);
            try {
                devServerProcess.kill('SIGINT');
            } catch (e) {
                // Ignore error if already dead
            }
            devServerProcess = null;
        }
    };

    // Ensure we clean up if the process is terminated
    process.on('SIGINT', () => {
        cleanup();
        process.exit(1);
    });
    process.on('exit', cleanup);

    // 2. Run all tests sequentially and gather results
    const results = {};
    let allPassed = true;

    for (const testFile of E2E_TESTS) {
        const passed = await runSingleTest(testFile);
        results[testFile] = passed;
        if (!passed) {
            allPassed = false;
        }
    }

    // 3. Print a beautiful premium summary dashboard
    console.log(`\n==================================================`);
    console.log(`                  TEST RUN SUMMARY                `);
    console.log(`==================================================`);
    
    for (const testFile of E2E_TESTS) {
        const statusIcon = results[testFile] ? '✅ PASS' : '❌ FAIL';
        const dotPadding = '.'.repeat(35 - testFile.length);
        console.log(` 📦 ${testFile} ${dotPadding} [${statusIcon}]`);
    }
    
    console.log(`==================================================`);
    if (allPassed) {
        console.log(` 🎉 Result: ALL ${E2E_TESTS.length} TESTS PASSED SUCCESSFULLY!`);
        console.log(`==================================================\n`);
        cleanup();
        process.exit(0);
    } else {
        console.log(` ❌ Result: SOME E2E TESTS FAILED.`);
        console.log(`            Please review individual failures above.`);
        console.log(`==================================================\n`);
        cleanup();
        process.exit(1);
    }
}

startOrchestrator().catch((err) => {
    console.error('💥 Critical error in orchestrator:', err);
    process.exit(1);
});
