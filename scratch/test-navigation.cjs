const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PORT = 5173;
const URL = `http://localhost:${PORT}`;

async function runTest() {
    console.log('🏁 Starting navigation trigger test...');
    
    // Check if onboarding file exists and read it
    const onboardingFile = path.join(__dirname, '../data/agent-qa-onboarding.json');
    if (fs.existsSync(onboardingFile)) {
        console.log('Current state on disk:', fs.readFileSync(onboardingFile, 'utf8'));
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Listen to console messages to see if there are any warnings or logs
    page.on('console', msg => {
        if (msg.text().includes('[fileStorage]') || msg.text().includes('tour') || msg.text().includes('driver')) {
            console.log(`[Browser Console] ${msg.text()}`);
        }
    });

    console.log('🔗 Navigating to app...');
    await page.goto(URL);
    await page.waitForTimeout(2000);

    // Check if general onboarding opened
    let popover = page.locator('.agent-eval-driver-popover');
    if (await popover.isVisible()) {
        console.log('🚨 Dashboard tour opened!');
        // Let's close it
        const closeBtn = page.locator('.driver-popover-close-btn');
        if (await closeBtn.isVisible()) {
            console.log('👉 Closing dashboard tour...');
            await closeBtn.click();
            await page.waitForTimeout(1000);
        }
    }

    // Now go to a project
    console.log('📂 Clicking on project "Open"...');
    const projectCard = page.locator('div.border-border.bg-card').first();
    await projectCard.locator('button:has-text("Open")').click();
    await page.waitForTimeout(2000);

    // Check if project onboarding opened
    if (await popover.isVisible()) {
        console.log('🚨 Project tour opened!');
        const closeBtn = page.locator('.driver-popover-close-btn');
        if (await closeBtn.isVisible()) {
            console.log('👉 Closing project tour...');
            await closeBtn.click();
            await page.waitForTimeout(1000);
        }
    }

    // Now, navigate the menus!
    // Let's click on the tabs: System Prompts, Environments, Missions, Info & Docs
    const tabs = ['System Prompts', 'Environments', 'Missions', 'Info & Docs'];
    for (const tab of tabs) {
        console.log(`👉 Clicking tab: ${tab}...`);
        await page.click(`button:has-text("${tab}")`);
        await page.waitForTimeout(1000);
        
        if (await popover.isVisible()) {
            console.log(`🚨 BUG! Project tour opened when clicking tab ${tab}!`);
            const title = await page.locator('.driver-popover-title').textContent();
            console.log(`   Popover title: "${title}"`);
        } else {
            console.log(`✅ OK: Tab ${tab} clicked without triggering tour.`);
        }
    }

    // Let's click the sidebar menus!
    const sidebarLinks = [
        { name: 'All Missions', selector: '#sidebar-missions' },
        { name: 'History', selector: '#sidebar-history' },
        { name: 'Settings', selector: '#sidebar-settings' },
        { name: 'Projects', selector: '#sidebar-projects' }
    ];
    for (const link of sidebarLinks) {
        console.log(`👉 Clicking sidebar link: ${link.name}...`);
        await page.click(link.selector);
        await page.waitForTimeout(1500);

        if (await popover.isVisible()) {
            console.log(`🚨 BUG! Tour opened when clicking sidebar link ${link.name}!`);
            const title = await page.locator('.driver-popover-title').textContent();
            console.log(`   Popover title: "${title}"`);
            
            // Close it
            const closeBtn = page.locator('.driver-popover-close-btn');
            if (await closeBtn.isVisible()) {
                await closeBtn.click();
                await page.waitForTimeout(500);
            }
        } else {
            console.log(`✅ OK: Sidebar link ${link.name} clicked without triggering tour.`);
        }

        // If we are back on dashboard, let's go back into the project
        if (link.name === 'Projects') {
            console.log('📂 Going back into project...');
            await projectCard.locator('button:has-text("Open")').click();
            await page.waitForTimeout(2000);
            
            if (await popover.isVisible()) {
                console.log('🚨 BUG! Project tour opened on return to project editor!');
                const title = await page.locator('.driver-popover-title').textContent();
                console.log(`   Popover title: "${title}"`);
            } else {
                console.log('✅ OK: Returned to project editor without triggering tour.');
            }
        }
    }

    await browser.close();
    console.log('🏁 Test finished.');
}

runTest();
