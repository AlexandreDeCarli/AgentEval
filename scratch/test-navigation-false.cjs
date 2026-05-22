const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PORT = 5173;
const URL = `http://localhost:${PORT}`;

async function runTest() {
    console.log('🏁 Starting navigation trigger test with onboarding = FALSE...');
    
    // Clear onboarding state on disk first to make sure they are false
    const onboardingFile = path.join(__dirname, '../data/agent-qa-onboarding.json');
    if (fs.existsSync(onboardingFile)) {
        console.log('🧹 Clearing onboarding state on disk...');
        fs.unlinkSync(onboardingFile);
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => {
        console.log(`[Browser Console - ${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', err => {
        console.error(`[Browser PageError] ${err.message}`);
    });

    console.log('🔗 Navigating to app...');
    await page.goto(URL);
    await page.waitForTimeout(2000);

    // Let's see if dashboard tour opened automatically
    let popover = page.locator('.agent-eval-driver-popover');
    if (await popover.isVisible()) {
        console.log('✅ Dashboard tour opened automatically (Correct).');
    } else {
        console.log('❌ Dashboard tour DID NOT open automatically.');
    }

    // Now go to project editor by clicking "Open"
    console.log('📂 Clicking on project "Open"...');
    const projectCard = page.locator('div.border-border.bg-card').first();
    await projectCard.locator('button:has-text("Open")').click({ force: true });
    await page.waitForTimeout(2000);

    // Let's see if project tour opened
    if (await popover.isVisible()) {
        const title = await page.locator('.driver-popover-title').textContent();
        console.log(`✅ Project tour opened automatically! Title: "${title}"`);
    } else {
        console.log('❌ Project tour DID NOT open automatically.');
    }

    await browser.close();
    console.log('🏁 Test finished.');
}

runTest();
