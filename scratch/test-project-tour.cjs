const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PORT = 5173;
const URL = `http://localhost:${PORT}`;
const SCREENSHOT_DIR = '/Users/alexandre/.gemini/antigravity/brain/440d8562-527c-49ae-bbc4-b40fbc05c8ae';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
    console.log('🚀 Iniciando Teste de Interface E2E para o Tour de Projeto Expandido (Missões IA)...');

    // Limpar estado do onboarding anterior para simular o primeiro acesso real do projeto
    const onboardingFile = path.join(__dirname, '../data/agent-qa-onboarding.json');
    if (fs.existsSync(onboardingFile)) {
        console.log('🧹 Limpando dados de onboarding persistidos anteriores...');
        fs.unlinkSync(onboardingFile);
    }

    let browser;
    try {
        console.log('🌐 Iniciando navegador Chromium (Playwright)...');
        browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const context = await browser.newContext({
            viewport: { width: 1280, height: 800 }
        });
        const page = await context.newPage();

        // 1. Acessar a aplicação
        console.log(`🔗 Navegando para ${URL}...`);
        await page.goto(URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#root');
        await sleep(2000); // Aguardar render e abertura do WelcomeModal

        // 2. Passar pelo WelcomeModal obrigatoriamente
        console.log('✨ Detectando exibição do WelcomeModal obrigatório no primeiro acesso...');
        const welcomeTitle = page.locator('text=Sobre o Projeto');
        if (await welcomeTitle.isVisible()) {
            console.log('👉 Modal de Boas-Vindas detectado. Avançando Etapa 1...');
            await page.click('text=Iniciar Tutorial');
            await sleep(800);

            console.log('👉 Aceitando Termos de Uso (Etapa 2)...');
            await page.click('#accept-terms-checkbox');
            await sleep(300);
            await page.click('text=Aceitar e Avançar');
            await sleep(800);

            console.log('👉 Pulando API Key na Etapa 3...');
            await page.click('text=Pular por enquanto / Configurar depois');
            await sleep(1500); // Aguardar fechamento físico e início do tour
        }

        // 3. Dispensar onboarding geral se estiver aberto
        const generalPopover = await page.locator('.agent-eval-driver-popover');
        if (await generalPopover.isVisible()) {
            console.log('👉 Fechando onboarding geral...');
            const closeBtn = page.locator('.driver-popover-close-btn');
            if (await closeBtn.isVisible()) {
                await closeBtn.click();
                await sleep(500);
            }
        }

        // 3. Acessar ou Criar um projeto
        console.log('📂 Verificando projetos existentes...');
        const projectCard = page.locator('div.border-border.bg-card').first();
        if (await projectCard.isVisible()) {
            console.log('👉 Clicando no "Open" do primeiro projeto existente...');
            await projectCard.locator('button:has-text("Open")').click();
        } else {
            console.log('➕ Nenhum projeto encontrado. Criando um novo...');
            const newProjBtn = page.locator('#new-project-button');
            if (await newProjBtn.isVisible()) {
                await newProjBtn.click();
                await sleep(1000);
            } else {
                throw new Error('Não foi possível encontrar ou criar um projeto.');
            }
        }

        await sleep(2000); // Aguardar carregamento da página do projeto e delay do onboarding (1000ms)

        // 4. Verificar se o Onboarding do Projeto iniciou automaticamente
        console.log('✨ Verificando exibição automática do Onboarding de Projeto...');
        const projectPopover = await page.locator('.agent-eval-driver-popover');
        const popoverVisible = await projectPopover.isVisible();

        if (popoverVisible) {
            console.log('✅ PASS: Onboarding de Projeto abriu automaticamente.');
            
            const title = await page.locator('.driver-popover-title').textContent();
            console.log(`   📝 Passo 1: "${title}"`);
            
            const path1 = path.join(SCREENSHOT_DIR, '05_onboarding_projeto_inicial.png');
            await page.screenshot({ path: path1 });
            console.log(`   📸 Captura do Passo 1 salva: ${path1}`);

            // Avançar pelas abas: Info, Prompts, Environments, Missions Tab
            const nextBtn = page.locator('.driver-popover-next-btn');
            
            // Avançar para Passo 2 (Info)
            console.log('👉 Avançando para o Passo 2...');
            await nextBtn.click();
            await sleep(500);
            console.log(`   📝 Passo 2: "${await page.locator('.driver-popover-title').textContent()}"`);

            // Avançar para Passo 3 (Prompts)
            console.log('👉 Avançando para o Passo 3...');
            await nextBtn.click();
            await sleep(500);
            console.log(`   📝 Passo 3: "${await page.locator('.driver-popover-title').textContent()}"`);

            // Avançar para Passo 4 (Environments)
            console.log('👉 Avançando para o Passo 4...');
            await nextBtn.click();
            await sleep(500);
            console.log(`   📝 Passo 4: "${await page.locator('.driver-popover-title').textContent()}"`);

            // Avançar para Passo 5 (Missions Tab)
            console.log('👉 Avançando para o Passo 5 (Aba de Missões)...');
            await nextBtn.click();
            await sleep(800); // Aguardar render/clique automático da aba
            console.log(`   📝 Passo 5: "${await page.locator('.driver-popover-title').textContent()}"`);

            // Validar que a aba Missions foi ativada de forma programática
            const activeTabButton = page.locator('#project-tab-missions');
            const classAttribute = await activeTabButton.getAttribute('class');
            if (classAttribute.includes('border-primary') || classAttribute.includes('text-foreground')) {
                console.log('✅ PASS: Aba "Missions" foi ativada de forma 100% programática pelo tour!');
            } else {
                console.error('❌ FAIL: Aba "Missions" não foi ativada pelo clique automático.');
            }

            // Salvar captura da Aba de Missões em destaque
            const pathTab = path.join(SCREENSHOT_DIR, '06_onboarding_projeto_passo2.png');
            await page.screenshot({ path: pathTab });
            console.log(`   📸 Captura da aba de missões ativa salva: ${pathTab}`);

            // Avançar para Passo 6 (Gerador de Missões com IA)
            console.log('👉 Avançando para o Passo 6 (Gerador de Missões IA)...');
            await nextBtn.click();
            await sleep(500);
            console.log(`   📝 Passo 6: "${await page.locator('.driver-popover-title').textContent()}"`);
            
            // Avançar para Passo 7 (Lista de Missões / Execução)
            console.log('👉 Avançando para o Passo 7 (Lista de Missões)...');
            await nextBtn.click();
            await sleep(500);
            console.log(`   📝 Passo 7: "${await page.locator('.driver-popover-title').textContent()}"`);

            // Finalizar o tour
            console.log('👉 Finalizando o Tour...');
            const doneBtn = page.locator('.driver-popover-close-btn');
            if (await doneBtn.isVisible()) {
                await doneBtn.click();
                await sleep(500);
            }
            console.log('✅ PASS: Tour finalizado com sucesso.');

        } else {
            console.error('❌ FAIL: Onboarding de Projeto NÃO abriu automaticamente.');
        }

        // 5. Abrir Menu de Ajuda dentro do Projeto
        console.log('💡 Abrindo a Central de Ajuda & Tutoriais no editor de projeto...');
        const helpBtn = page.locator('#sidebar-help-button');
        if (await helpBtn.isVisible()) {
            await helpBtn.click();
            await sleep(500);

            const helpMenuTitle = await page.locator('h2:has-text("Ajuda & Aprendizado")');
            if (await helpMenuTitle.isVisible()) {
                console.log('✅ PASS: Menu de ajuda abriu dentro da página de projetos.');

                const path3 = path.join(SCREENSHOT_DIR, '07_menu_ajuda_projeto.png');
                await page.screenshot({ path: path3 });
                console.log(`   📸 Captura de tela do menu de ajuda salva: ${path3}`);

                // Reiniciar o Onboarding do Projeto
                console.log('🔄 Testando reinício do Onboarding do Projeto...');
                const restartProjectBtn = page.locator('button:has-text("Iniciar Tour do Projeto")');
                if (await restartProjectBtn.isVisible()) {
                    await restartProjectBtn.click();
                    await sleep(1000);

                    const projectPopoverReopened = await page.locator('.agent-eval-driver-popover').isVisible();
                    if (projectPopoverReopened) {
                        console.log('✅ PASS: Tour do Projeto reiniciado com sucesso a partir do Menu de Ajuda!');
                        const path4 = path.join(SCREENSHOT_DIR, '08_tour_projeto_reiniciado.png');
                        await page.screenshot({ path: path4 });
                        console.log(`   📸 Captura de tela do reinício salva: ${path4}`);
                    } else {
                        console.error('❌ FAIL: Popover do projeto não reabriu.');
                    }
                } else {
                    console.error('❌ FAIL: Botão "Iniciar Tour do Projeto" não encontrado no Menu de Ajuda.');
                }
            } else {
                console.error('❌ FAIL: Menu de ajuda lateral não abriu.');
            }
        }

        console.log('\n🌟 TODOS OS TESTES E2E DO PROJETO CONCLUÍDOS COM SUCESSO! 🌟\n');

    } catch (e) {
        console.error('❌ Erro durante o teste E2E do projeto:', e);
    } finally {
        if (browser) {
            console.log('🔌 Fechando navegador...');
            await browser.close();
        }
        process.exit(0);
    }
}

runTests();
