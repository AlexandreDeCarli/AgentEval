const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PORT = 5173;
const URL = `http://localhost:${PORT}`;

async function runTest() {
    console.log('🏁 Starting E2E test with Playwright Chromium to debug reset issue...');

    // 1. Force state on disk to TRUE (Onboarding completed)
    const onboardingFile = path.join(__dirname, '../data/agent-qa-onboarding.json');
    console.log('📝 Setting onboarding status on disk to TRUE (Completed)...');
    fs.writeFileSync(onboardingFile, JSON.stringify({
        state: {
            hasCompletedOnboarding: true,
            hasCompletedProjectOnboarding: true
        },
        version: 0
    }), 'utf-8');

    // 2. Launch browser
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 3. Listeners
    page.on('console', msg => {
        console.log(`[Browser Console - ${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', err => {
        console.error(`[Browser PageError] ${err.message}`);
    });

    page.on('request', req => {
        if (req.url().includes('/api/store')) {
            console.log(`[Browser Request - ${req.method()}] ${req.url()}`);
        }
    });

    page.on('requestfinished', req => {
        if (req.url().includes('/api/store')) {
            console.log(`[Browser Request SUCCESS - ${req.method()}] ${req.url()}`);
        }
    });

    page.on('requestfailed', req => {
        if (req.url().includes('/api/store')) {
            console.log(`[Browser Request FAILED - ${req.method()}] ${req.url()} - Error: ${req.failure() ? req.failure().errorText : 'unknown'}`);
        }
    });

    console.log('🔗 Navigating to app...');
    await page.goto(URL);
    await page.waitForTimeout(2000);

    // Verify tour is NOT active initially
    let popover = page.locator('.agent-eval-driver-popover');
    if (await popover.isVisible()) {
        console.log('❌ ERROR: Onboarding tour opened automatically even though status was TRUE.');
    } else {
        console.log('✅ Correct: Onboarding tour did not open automatically (Onboarding already completed).');
    }

    // Click "Ajuda & Tutoriais" button to open the menu
    console.log('💡 Clicking sidebar help button...');
    await page.click('#sidebar-help-button');
    await page.waitForTimeout(1000);

    // Click the Reset button
    console.log('🔄 Clicking "Resetar Histórico de Tutoriais"...');
    await page.click('button:has-text("Resetar Histórico de Tutoriais")');

    // Wait for the page reload/navigation to complete
    console.log('⏳ Waiting for page reload/navigation to settle...');
    await page.waitForTimeout(3000);

    // Verify if the dashboard tour opened automatically now!
    if (await popover.isVisible()) {
        const title = await page.locator('.driver-popover-title').textContent();
        console.log(`✅ SUCCESS: Onboarding tour auto-started after reset! Title: "${title}"`);
    } else {
        console.log('❌ FAIL: Onboarding tour did not auto-start after reset.');
        
        // Let's print values of localStorage and state to inspect
        const localStorageState = await page.evaluate(() => localStorage.getItem('agent-qa-onboarding'));
        console.log(`[Inspection] LocalStorage 'agent-qa-onboarding': ${localStorageState}`);
    }

    await browser.close();
    console.log('🏁 Debug session finished.');
}

runTest();
