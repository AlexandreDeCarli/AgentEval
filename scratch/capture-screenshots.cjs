const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const net = require('net');

const PORT = 5173;
const URL = `http://localhost:${PORT}`;
const DOCS_DIR = path.join(__dirname, '../docs');
const DATA_DIR = path.join(__dirname, '../data');

// Mock data structures for beautiful screenshots
const MOCK_SETTINGS = {
    "state": {
        "geminiApiKey": "AIzaSyTestApiKeyForBeautifulScreenshots123"
    },
    "version": 0
};

const MOCK_ONBOARDING = {
    "state": {
        "hasCompletedOnboarding": true,
        "hasCompletedProjectOnboarding": true,
        "hasCompletedMissionOnboarding": true,
        "hasCompletedWelcomeModal": true,
        "dashboardTourCurrentStep": 0
    },
    "version": 0
};

const MOCK_PROJECTS = [
    {
        "id": "project-customer-support",
        "name": "E-Commerce Support Assistant",
        "description": "Exposed via HTTP API. Automates order lookup, refund status checks, product recommendations, and live supervisor escalation tests.",
        "target_provider": "http",
        "gemini_model": "gemini-1.5-pro",
        "system_prompts": [
            {
                "id": "sp-customer-support",
                "name": "Default Support Persona",
                "content": "You are a professional customer support assistant for Zenith E-Commerce. Help users check order statuses, process simple refunds, and answer general queries. Remain polite and helpful."
            }
        ],
        "environments": [
            {
                "id": "env-production",
                "name": "Production Webhook",
                "api_config": {
                    "post_url": "https://api.zenith.com/v1/chat",
                    "get_url": "https://api.zenith.com/v1/chat/history/{{tester_id}}",
                    "payload_template": "{\n  \"userId\": \"{{tester_id}}\",\n  \"message\": \"{{message}}\"\n}",
                    "auth_header": "Bearer prod_live_key_9837fbc"
                }
            }
        ],
        "documentation": "# E-Commerce Support Assistant\n\nAutomates Zenith E-Commerce customer service flows.\n\n## Capabilities\n- Order lookup via Order ID (`ZE-XXXX`)\n- Basic refunds for orders under $50\n- Dynamic routing to live support"
    },
    {
        "id": "project-refactor-helper",
        "name": "Intelligent Code Refactorer",
        "description": "Direct Gemini testing target. Validates TypeScript refactoring logic, type safety, modularization suggestions, and performance optimizations.",
        "target_provider": "gemini",
        "gemini_model": "gemini-1.5-pro",
        "system_prompts": [
            {
                "id": "sp-refactorer",
                "name": "Senior Software Architect Persona",
                "content": "You are a senior TypeScript software architect. Propose modular decomposition, proper type definitions, and performance optimizations."
            }
        ],
        "environments": [],
        "documentation": "# Code Refactoring Helper\n\nIntelligent agent designed for pair-programming refactoring tasks."
    }
];

const MOCK_MISSIONS = [
    {
        "id": "mission-order-lookup",
        "project_id": "project-customer-support",
        "titulo": "Verify Valid Order Tracking",
        "tester_persona": "You are a customer who purchased a Zenith watch last week. You want to check your order tracking status. Your order ID is ZE-9821. Be friendly.",
        "mission_goal": "Ask the assistant to track your order `ZE-9821`. Confirm that the assistant successfully returns the tracking status and estimated delivery date.",
        "system_prompt_id": "sp-customer-support",
        "environment_id": "env-production",
        "max_turns": 5,
        "variables": {
            "tester_id": "tester_9821"
        },
        "evaluation_criteria": [
            "Assistant successfully recognizes Order ID ZE-9821",
            "Assistant provides a realistic delivery estimation date",
            "Polite and professional support tone maintained"
        ]
    },
    {
        "id": "mission-escalation",
        "project_id": "project-customer-support",
        "titulo": "Test Live Agent Escalation Routing",
        "tester_persona": "You are an angry customer who received a defective smart watch. You want to speak to a human supervisor immediately. Refuse to talk to a robot.",
        "mission_goal": "Insist on speaking with a human representative. Verify that the chatbot triggers a supervisor escalation transfer correctly.",
        "system_prompt_id": "sp-customer-support",
        "environment_id": "env-production",
        "max_turns": 4,
        "variables": {
            "tester_id": "tester_angry_99"
        },
        "evaluation_criteria": [
            "Assistant triggers supervisor handoff within 2 turns",
            "Handoff message is clear and includes transfer ID"
        ]
    }
];

const MOCK_TEST_RUNS = [
    {
        "id": "run-order-lookup-success",
        "mission_id": "mission-order-lookup",
        "status": "success",
        "chat_history": [
            {
                "id": "msg-1",
                "role": "tester",
                "content": "Hi there! I bought a Zenith watch last week and would love to track my order. The order ID is ZE-9821. Can you check where it is?",
                "timestamp": 1779836400000
            },
            {
                "id": "msg-2",
                "role": "target",
                "content": "Hello! I would be happy to help you with that. Let me look up order ZE-9821... Yes, I see it! Your Zenith Watch is currently in transit. It has left our primary sorting center in Chicago and is scheduled to be delivered to your address on Friday, May 29th. You can track it live via our transit partner link.",
                "timestamp": 1779836401200
            },
            {
                "id": "msg-3",
                "role": "tester",
                "content": "That is wonderful news, thank you so much! Friday works perfectly for me. Appreciate the fast help!",
                "timestamp": 1779836403000
            },
            {
                "id": "msg-4",
                "role": "target",
                "content": "You are very welcome! Is there anything else I can assist you with today? Have a fantastic rest of your week!",
                "timestamp": 1779836404100
            }
        ],
        "debug_logs": [
            {
                "id": "log-1",
                "timestamp": 1779836400500,
                "type": "POST",
                "url": "https://api.zenith.com/v1/chat",
                "status": 200,
                "duration": 480,
                "requestBody": {
                    "userId": "tester_9821",
                    "message": "Hi there! I bought a Zenith watch last week and would love to track my order. The order ID is ZE-9821. Can you check where it is?"
                },
                "response": {
                    "status": "success",
                    "messages": [
                        {
                            "id": "zenith-msg-9921",
                            "role": "model",
                            "content": "Hello! I would be happy to help you with that. Let me look up order ZE-9821... Yes, I see it! Your Zenith Watch is currently in transit."
                        }
                    ]
                }
            }
        ],
        "evaluation": {
            "overall_score": 96,
            "criteria_evaluations": [
                {
                    "criterion": "Assistant successfully recognizes Order ID ZE-9821",
                    "passed": true,
                    "score": 10,
                    "reasoning": "The assistant immediately matched the exact order ID and retrieved the corresponding record correctly."
                },
                {
                    "criterion": "Assistant provides a realistic delivery estimation date",
                    "passed": true,
                    "score": 10,
                    "reasoning": "The assistant specified that the watch is scheduled for delivery on Friday, May 29th, giving a precise and realistic estimate."
                },
                {
                    "criterion": "Polite and professional support tone maintained",
                    "passed": true,
                    "score": 9,
                    "reasoning": "Highly polite, welcoming, and helpful dialogue throughout the conversation."
                }
            ],
            "summary": "The chatbot executed the mission flawlessly. It correctly identified the order tracking ID ZE-9821 and provided a detailed delivery estimation date within a single turn, maintaining an excellent supportive tone.",
            "suggestions": [
                {
                    "category": "suggestion",
                    "severity": "suggestion",
                    "description": "Consider adding the estimated arrival time range (e.g. 9 AM - 5 PM) to give the customer even more clarity on the delivery day.",
                    "impact": "Improves overall customer satisfaction during deliveries."
                }
            ],
            "metrics": {
                "avg_time_to_first_response_ms": 1200,
                "avg_time_to_complete_response_ms": 1200
            }
        },
        "resolved_variables": {
            "tester_id": "tester_9821"
        },
        "created_at": 1779836400000,
        "updated_at": 1779836404100
    }
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureAll() {
    console.log('🏁 Starting E2E Screenshot Capture Automation...');

    if (!fs.existsSync(DOCS_DIR)) {
        fs.mkdirSync(DOCS_DIR, { recursive: true });
    }

    // 1. Back up existing user data
    const filesToBackup = ['settings', 'onboarding', 'projects', 'missions', 'test-runs'];
    const backups = {};
    
    filesToBackup.forEach(name => {
        const filePath = path.join(DATA_DIR, `agent-qa-${name}.json`);
        if (fs.existsSync(filePath)) {
            backups[name] = fs.readFileSync(filePath, 'utf8');
        }
    });

    console.log('💾 Existing user database backed up in memory.');

    // 2. Helper to write JSON files
    const writeData = (name, data) => {
        let payload = data;
        if (name === 'projects') {
            payload = { "state": { "projects": data }, "version": 0 };
        } else if (name === 'missions') {
            payload = { "state": { "missions": data }, "version": 0 };
        } else if (name === 'test-runs') {
            payload = { "state": { "runs": data }, "version": 0 };
        }
        fs.writeFileSync(path.join(DATA_DIR, `agent-qa-${name}.json`), JSON.stringify(payload, null, 2), 'utf8');
    };

    // Verify server is active
    const active = await isPortOpen(PORT);
    if (!active) {
        console.error(`❌ Error: Vite development server is not running on port ${PORT}. Please run 'npm run dev' first.`);
        process.exit(1);
    }

    let browser;
    try {
        console.log('🌐 Spawning browser instance...');
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            viewport: { width: 1440, height: 900 }
        });
        const page = await context.newPage();

        // ==========================================
        // 📸 SCREENSHOT 1: Welcome Modal & Onboarding Setup
        // ==========================================
        console.log('📸 Capture 1: Welcome Modal...');
        // To show Welcome Modal, onboarding state must have WelcomeModal=false
        writeData('settings', { "state": { "geminiApiKey": "" }, "version": 0 });
        writeData('onboarding', { "state": { "hasCompletedWelcomeModal": false }, "version": 0 });
        writeData('projects', []);
        writeData('missions', []);
        writeData('test-runs', []);

        await page.goto(URL);
        await sleep(1500); // Wait for modal to render
        await page.screenshot({ path: path.join(DOCS_DIR, 'welcome_modal.png') });
        console.log('   ✓ welcome_modal.png captured.');

        // ==========================================
        // 📸 SCREENSHOT 2: Projects Dashboard
        // ==========================================
        console.log('📸 Capture 2: Projects Dashboard...');
        // Write the full dynamic rich mock database
        writeData('settings', MOCK_SETTINGS);
        writeData('onboarding', MOCK_ONBOARDING);
        writeData('projects', MOCK_PROJECTS);
        writeData('missions', MOCK_MISSIONS);
        writeData('test-runs', MOCK_TEST_RUNS);

        await page.goto(URL);
        await sleep(1500); // Wait for projects list to load and transitions
        await page.screenshot({ path: path.join(DOCS_DIR, 'demo_projects.png') });
        console.log('   ✓ demo_projects.png captured.');

        // ==========================================
        // 📸 SCREENSHOT 3: Help Menu & Knowledge Panel
        // ==========================================
        console.log('📸 Capture 3: Help Menu on Dashboard...');
        // Click help menu button on sidebar
        await page.click('#sidebar-help-button');
        await sleep(800); // Wait for slide-out transition
        await page.screenshot({ path: path.join(DOCS_DIR, 'help_menu.png') });
        console.log('   ✓ help_menu.png captured.');

        // Close help center
        await page.click('button:has-text("Close Help Center")');
        await sleep(500);

        // ==========================================
        // 📸 SCREENSHOT 4: Mission Board
        // ==========================================
        console.log('📸 Capture 4: Mission Board (Project Page)...');
        // Click Open Project on first project
        await page.click('button:has-text("Open Project")');
        await sleep(1500); // Wait for project page loading
        await page.screenshot({ path: path.join(DOCS_DIR, 'demo_project_missions.png') });
        console.log('   ✓ demo_project_missions.png captured.');

        // ==========================================
        // 📸 SCREENSHOT 5: Interactive Project Tour
        // ==========================================
        console.log('📸 Capture 5: Interactive Tour...');
        // Click Help Center in Project view
        await page.click('#sidebar-help-button');
        await sleep(600);
        // Navigate to Interactive Tours tab
        await page.click('button:has-text("Interactive Tours")');
        await sleep(300);
        // Start Project Tour
        await page.click('button:has-text("Start Project Tour")');
        await sleep(1200); // Let DriverJs popover mount and overlay
        await page.screenshot({ path: path.join(DOCS_DIR, 'project_tour.png') });
        console.log('   ✓ project_tour.png captured.');

        // Close tour popover
        await page.click('.driver-popover-close-btn');
        await sleep(500);

        // ==========================================
        // 📸 SCREENSHOT 6: Test History List
        // ==========================================
        console.log('📸 Capture 6: Test History List...');
        await page.click('#sidebar-history');
        await sleep(1200); // Wait for history cards render
        await page.screenshot({ path: path.join(DOCS_DIR, 'demo_history.png') });
        console.log('   ✓ demo_history.png captured.');

        // ==========================================
        // 📸 SCREENSHOT 7: Evaluation Report Dashboard
        // ==========================================
        console.log('📸 Capture 7: Evaluation Report Details Modal...');
        // Click Details on the history card
        await page.click('button:has-text("Details")');
        await sleep(1500); // Wait for evaluation details modal and charts animation
        await page.screenshot({ path: path.join(DOCS_DIR, 'demo_evaluation.png') });
        console.log('   ✓ demo_evaluation.png captured.');

        console.log('🎉 All premium screenshots captured successfully!');

    } catch (err) {
        console.error('💥 Error capturing screenshots:', err);
    } finally {
        if (browser) {
            await browser.close();
        }

        // 3. Restore user's original backed up data files
        console.log('🧹 Restoring user\'s original database backups...');
        filesToBackup.forEach(name => {
            const filePath = path.join(DATA_DIR, `agent-qa-${name}.json`);
            if (backups[name]) {
                fs.writeFileSync(filePath, backups[name], 'utf8');
            } else if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // delete mock file if user originally didn't have it
            }
        });
        console.log('✅ User database successfully restored.');
    }
}

captureAll();
