const { exec } = require('child_process');
const { chromium } = require('playwright');
const path = require('path');
const net = require('net');

const PORT = 5177;
const URL = `http://localhost:${PORT}`;
const NODE_PATH = path.dirname(process.execPath);

function isPortOpen(port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const onError = () => {
            socket.destroy();
            resolve(false);
        };
        socket.setTimeout(1000);
        socket.on('error', onError);
        socket.on('timeout', onError);
        socket.connect(port, 'localhost', () => {
            socket.end();
            resolve(true);
        });
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPort(port, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (await isPortOpen(port)) return true;
        await sleep(300);
    }

    return false;
}

async function dismissWelcome(page) {
    const welcomeTitle = page.locator('text=About the Project');
    if (!(await welcomeTitle.isVisible().catch(() => false))) return;

    await page.click('text=Get Started');
    await page.click('#accept-terms-checkbox');
    await page.click('text=Accept and Proceed');
    await page.click('text=Skip for now / Configure later');
}

async function runTests() {
    let serverProcess;
    let browser;
    let hasFailed = false;

    try {
        if (!(await isPortOpen(PORT))) {
            serverProcess = exec(`${process.execPath} ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${PORT} --strictPort`, {
                cwd: path.join(__dirname, '..'),
                env: {
                    ...process.env,
                    PATH: `${NODE_PATH}:${path.join(__dirname, '../node_modules/.bin')}:${process.env.PATH || ''}`,
                },
            });
            serverProcess.stderr.on('data', (data) => {
                console.error(`[Vite Error] ${data.toString().trim()}`);
            });

            if (!(await waitForPort(PORT))) {
                throw new Error(`Vite dev server did not start on port ${PORT} in time`);
            }
        }

        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        const page = await context.newPage();

        await page.goto(`${URL}/projects/demo-shopassist-001?tab=missions`, {
            waitUntil: 'domcontentloaded',
        });
        await dismissWelcome(page);

        const searchInput = page.getByLabel('Search missions by title or goal');
        const environmentSelect = page.getByLabel('Filter missions by environment');
        const promptSelect = page.getByLabel('Filter missions by system prompt');

        await searchInput.waitFor({ state: 'visible', timeout: 5000 });
        await environmentSelect.waitFor({ state: 'visible', timeout: 5000 });
        await promptSelect.waitFor({ state: 'visible', timeout: 5000 });

        await environmentSelect.selectOption('demo-env-mock');
        await promptSelect.selectOption('sp-shop-orders');
        await searchInput.fill('Order');
        await page.waitForTimeout(300);

        const runAllButton = page.locator('button:has-text("Run All")');
        await runAllButton.waitFor({ state: 'visible', timeout: 5000 });
        const runAllText = await runAllButton.textContent();
        if (!runAllText || !runAllText.includes('Run All (2)')) {
            throw new Error(`Expected filtered Run All (2), got: ${runAllText}`);
        }

        const visibleCards = page.locator('#project-missions-list [aria-label^="Select mission"]');
        const visibleCardCount = await visibleCards.count();
        if (visibleCardCount !== 2) {
            throw new Error(`Expected 2 selectable filtered missions, got: ${visibleCardCount}`);
        }

        await visibleCards.first().check();

        const runSelectedButton = page.locator('button:has-text("Run Selected")');
        await runSelectedButton.waitFor({ state: 'visible', timeout: 5000 });
        const selectedText = await runSelectedButton.textContent();
        if (!selectedText || !selectedText.includes('Run Selected (1)')) {
            throw new Error(`Expected Run Selected (1), got: ${selectedText}`);
        }

        await searchInput.fill('No matching mission');
        await page.waitForTimeout(300);
        await searchInput.fill('Order');
        await visibleCards.first().waitFor({ state: 'visible', timeout: 5000 });

        if (!(await visibleCards.first().isChecked())) {
            throw new Error('Expected the selected mission to remain selected after changing filters');
        }

        const restoredSelectedText = await runSelectedButton.textContent();
        if (!restoredSelectedText || !restoredSelectedText.includes('Run Selected (1)')) {
            throw new Error(`Expected restored Run Selected (1), got: ${restoredSelectedText}`);
        }

        await page.locator('button:has-text("Clear selection")').click();
        await runAllButton.waitFor({ state: 'visible', timeout: 5000 });

        console.log('PASS project mission filters');
    } catch (error) {
        console.error(error);
        hasFailed = true;
    } finally {
        if (browser) await browser.close();
        if (serverProcess) serverProcess.kill('SIGINT');
        process.exit(hasFailed ? 1 : 0);
    }
}

runTests();
