const { exec } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const { chromium } = require('playwright');

const PORT = 5184;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PROJECT_ROOT = path.join(__dirname, '../..');

function isPortOpen() {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const done = (open) => {
            socket.destroy();
            resolve(open);
        };
        socket.setTimeout(500);
        socket.once('error', () => done(false));
        socket.once('timeout', () => done(false));
        socket.connect(PORT, '127.0.0.1', () => done(true));
    });
}

async function waitForServer(timeoutMs = 15_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await isPortOpen()) return;
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Vite did not start on port ${PORT}`);
}

function usageEvent(overrides = {}) {
    return {
        id: crypto.randomUUID(),
        occurredAt: Date.now() - 60_000,
        routine: 'tester_conversation',
        requestedModel: 'gemini-2.5-flash',
        resolvedModel: 'gemini-2.5-flash-001',
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

const usageStoreSeed = JSON.stringify({
    state: {
        events: [
            usageEvent(),
            usageEvent({
                id: 'evaluation-event',
                responseId: 'evaluation-response',
                routine: 'evaluation',
                estimatedInputCostUsd: 0.004,
                estimatedOutputCostUsd: 0.006,
                estimatedCostUsd: 0.01,
            }),
        ],
    },
    version: 1,
});

const stores = {
    'agent-qa-onboarding': JSON.stringify({
        state: {
            hasCompletedOnboarding: true,
            hasCompletedProjectOnboarding: true,
            hasCompletedMissionOnboarding: true,
            hasCompletedWelcomeModal: true,
            dashboardTourCurrentStep: 0,
        },
        version: 0,
    }),
    'agent-qa-ai-usage': usageStoreSeed,
    'agent-qa-missions': JSON.stringify({
        state: {
            missions: [{
                id: 'mission-1',
                project_id: 'project-1',
                titulo: 'Seeded usage mission',
                target_system_prompt: 'Help the user.',
                tester_persona: 'Test the assistant.',
                mission_goal: 'Validate the seeded run.',
                variables: {},
                max_turns: 2,
                api_config: {},
                evaluation_criteria: [],
            }],
        },
        version: 0,
    }),
    'agent-qa-projects': JSON.stringify({
        state: {
            projects: [{
                id: 'project-1',
                name: 'Seeded project',
                description: '',
                documentation: '',
                system_prompts: [],
                environments: [],
            }],
        },
        version: 0,
    }),
    'agent-qa-test-runs': JSON.stringify({
        state: {
            runs: [{
                id: 'run-1',
                mission_id: 'mission-1',
                status: 'success',
                chat_history: [],
                evaluation: {
                    overall_score: 92,
                    summary: 'The seeded run passed.',
                    criteria_scores: [],
                    prompt_improvements: [],
                    metrics: {
                        avg_time_to_first_response_ms: 100,
                        avg_time_to_complete_response_ms: 200,
                    },
                },
                resolved_variables: {},
                debug_logs: [],
                created_at: Date.now() - 60_000,
                updated_at: Date.now() - 60_000,
            }],
        },
        version: 0,
    }),
};

async function installStoreRoutes(page) {
    await page.route('**/api/store/**', async (route) => {
        const url = new URL(route.request().url());
        const key = decodeURIComponent(url.pathname.split('/').pop());
        if (route.request().method() === 'GET') {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: stores[key] || '',
            });
        }
        if (route.request().method() === 'DELETE') {
            stores[key] = '';
        } else if (route.request().method() === 'PUT') {
            stores[key] = route.request().postData() || '';
        }
        return route.fulfill({ status: 200, body: '' });
    });
}

async function dismissWelcome(page) {
    const welcome = page.getByText('About the Project');
    if (!(await welcome.isVisible().catch(() => false))) return;
    await page.getByText('Get Started').click();
    await page.locator('#accept-terms-checkbox').click();
    await page.getByText('Accept and Proceed').click();
    await page.getByText('Skip for now / Configure later').click();
}

async function assertDashboard(page) {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await dismissWelcome(page);
    await page.getByRole('tab', { name: 'Usage & Costs' }).click();
    await page.getByRole('heading', { name: 'AI Usage & Costs' }).waitFor();
    await page.getByText('$0.0130', { exact: true }).waitFor();
    await page.waitForFunction(() =>
        Array.from(document.querySelectorAll('span')).some((element) =>
            element.textContent?.trim() === 'Tester Conversation' && element.getBoundingClientRect().height > 0
        )
    );
    await page.waitForFunction(() =>
        Array.from(document.querySelectorAll('span')).some((element) =>
            element.textContent?.trim() === 'Evaluation' && element.getBoundingClientRect().height > 0
        )
    );
    await page.getByRole('button', { name: '24h' }).click();
    await page.getByRole('button', { name: 'Clear history' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete Usage History?' });
    await dialog.waitFor();
    const focusedButton = await page.evaluate(() => document.activeElement?.textContent?.trim());
    if (focusedButton !== 'Cancel') throw new Error(`Expected modal focus on Cancel, got ${focusedButton}`);
    await page.getByRole('heading', { name: 'Delete Usage History?' }).waitFor();
    await page.getByRole('button', { name: 'Cancel' }).click();

    const canvasHasData = await page.locator('canvas').evaluate((canvas) => {
        const context = canvas.getContext('2d');
        if (!context) return false;
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let index = 3; index < pixels.length; index += 4) {
            if (pixels[index] > 0) return true;
        }
        return false;
    });
    if (!canvasHasData) throw new Error('Expected the usage chart canvas to contain rendered pixels');
}

async function assertSettingsKeyboardAndExport(page) {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    const aiTab = page.getByRole('tab', { name: 'AI Configuration' });
    await aiTab.focus();
    await page.keyboard.press('ArrowRight');
    const usageTab = page.getByRole('tab', { name: 'Usage & Costs' });
    if ((await usageTab.getAttribute('aria-selected')) !== 'true') {
        throw new Error('Expected ArrowRight to activate the next settings tab');
    }

    await page.getByRole('tab', { name: 'Workspace Migration' }).click();
    const downloadState = await page.evaluate(() => {
        const state = { attachedAtClick: false, revoked: false };
        const originalClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function click() {
            state.attachedAtClick = document.body.contains(this);
        };
        const originalCreate = URL.createObjectURL;
        const originalRevoke = URL.revokeObjectURL;
        URL.createObjectURL = () => 'blob:test-export';
        URL.revokeObjectURL = () => { state.revoked = true; };
        window.__downloadAudit = { state, originalClick, originalCreate, originalRevoke };
        return true;
    });
    if (!downloadState) throw new Error('Unable to install download audit');
    await page.getByRole('button', { name: 'Export' }).click();
    const immediately = await page.evaluate(() => window.__downloadAudit.state);
    if (!immediately.attachedAtClick) throw new Error('Export link was not attached to the DOM before click');
    if (immediately.revoked) throw new Error('Export object URL was revoked synchronously');
    await page.waitForTimeout(150);
    const eventually = await page.evaluate(() => window.__downloadAudit.state.revoked);
    if (!eventually) throw new Error('Export object URL was not eventually revoked');
}

async function assertRunSummary(page) {
    await page.goto(`${BASE_URL}/history`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Details/ }).click();
    await page.getByRole('heading', { name: 'AI Usage for This Run' }).waitFor();
    await page.getByText('$0.013000', { exact: true }).waitFor();
    await page.getByText('$0.003000', { exact: true }).waitFor();
    await page.getByText('$0.010000', { exact: true }).waitFor();
    await page.getByText('200 / 100', { exact: true }).waitFor();
}

async function assertClearHistory(page) {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: 'Usage & Costs' }).click();
    await page.getByRole('heading', { name: 'AI Usage & Costs' }).waitFor();
    await page.getByRole('button', { name: 'Clear history' }).click();
    await page.getByRole('heading', { name: 'Delete Usage History?' }).waitFor();
    await page.getByRole('button', { name: 'Yes, Delete' }).click();
    await page.getByText('No Gemini usage in this period', { exact: true }).waitFor();
    await page.getByText('$0.0000', { exact: true }).waitFor();
    await page.getByRole('cell', { name: 'No usage events match this period.' }).waitFor();
}

async function main() {
    let serverProcess;
    let browser;
    const consoleErrors = [];

    try {
        if (!(await isPortOpen())) {
            serverProcess = exec(
                `${process.execPath} ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${PORT} --strictPort`,
                { cwd: PROJECT_ROOT, env: process.env }
            );
            serverProcess.stderr.on('data', (data) => process.stderr.write(data));
            await waitForServer();
        }

        browser = await chromium.launch({ headless: true });
        const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        const desktopPage = await desktop.newPage();
        desktopPage.on('console', (message) => {
            if (message.type() === 'error') consoleErrors.push(message.text());
        });
        await installStoreRoutes(desktopPage);
        await assertDashboard(desktopPage);
        await assertSettingsKeyboardAndExport(desktopPage);
        await assertRunSummary(desktopPage);
        await assertDashboard(desktopPage);
        await desktopPage.screenshot({
            path: path.join(PROJECT_ROOT, 'test-results-ai-usage-desktop.png'),
            fullPage: true,
            animations: 'disabled',
        });
        await desktop.close();

        const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const mobilePage = await mobile.newPage();
        stores['agent-qa-ai-usage'] = usageStoreSeed;
        await installStoreRoutes(mobilePage);
        await assertDashboard(mobilePage);
        const smallTargets = await mobilePage.locator('button').evaluateAll((buttons) =>
            buttons
                .filter((button) => {
                    const rect = button.getBoundingClientRect();
                    return !button.disabled && rect.width > 0 && rect.height > 0 && rect.height < 44;
                })
                .map((button) => ({ label: button.getAttribute('aria-label') || button.textContent?.trim(), height: button.getBoundingClientRect().height }))
        );
        if (smallTargets.length > 0) throw new Error(`Touch targets below 44px: ${JSON.stringify(smallTargets)}`);
        const mainWidth = await mobilePage.locator('main').evaluate((element) => element.getBoundingClientRect().width);
        if (mainWidth < 360) throw new Error(`Expected at least 360px of mobile content width, got ${mainWidth}px`);
        const bodyOverflow = await mobilePage.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
        if (bodyOverflow) throw new Error('Dashboard causes page-level horizontal overflow on mobile');
        await mobilePage.screenshot({
            path: path.join(PROJECT_ROOT, 'test-results-ai-usage-mobile.png'),
            fullPage: true,
            animations: 'disabled',
        });
        await mobile.close();

        const emptyState = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const emptyStatePage = await emptyState.newPage();
        stores['agent-qa-ai-usage'] = usageStoreSeed;
        await installStoreRoutes(emptyStatePage);
        await assertClearHistory(emptyStatePage);
        await emptyState.close();

        if (consoleErrors.length > 0) {
            throw new Error(`Console errors detected:\n${consoleErrors.join('\n')}`);
        }
        console.log('PASS AI usage dashboard desktop and mobile');
    } finally {
        if (browser) await browser.close();
        if (serverProcess) serverProcess.kill('SIGINT');
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
