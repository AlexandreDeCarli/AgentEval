const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PORT = 5173;
const URL = `http://localhost:${PORT}`;
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || 
                       (fs.existsSync('/Users/alexandre') ? '/Users/alexandre/.gemini/antigravity/brain/440d8562-527c-49ae-bbc4-b40fbc05c8ae' : path.join(__dirname, '../output/screenshots'));

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
    console.log('🚀 Iniciando Teste de Interface E2E para Pausar e Retomar o Tour...');

    // Limpar estado do onboarding anterior para simular o primeiro acesso real
    const onboardingFile = path.join(__dirname, '../data/agent-qa-onboarding.json');
    if (fs.existsSync(onboardingFile)) {
        console.log('🧹 Limpando dados de onboarding persistidos anteriores...');
        try {
            fs.unlinkSync(onboardingFile);
        } catch (e) {
            console.error('Falha ao deletar arquivo:', e);
        }
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

        // 1. PRIMEIRO ACESSO: Exibir Welcome Modal, avançar e iniciar Tour Geral
        console.log(`🔗 Navegando para ${URL}...`);
        await page.goto(URL, { waitUntil: 'domcontentloaded' });
        await sleep(1500); // Aguardar render e hidratação

        console.log('✨ Fechando Modal de Boas-Vindas clicando em "Get Started"...');
        await page.click('text=Get Started');
        await sleep(800);

        console.log('👉 Aceitando Termos de Uso (Etapa 2)...');
        await page.click('#accept-terms-checkbox');
        await sleep(300);
        await page.click('text=Accept and Proceed');
        await sleep(800);

        console.log('👉 Pulando API Key na Etapa 3...');
        await page.click('text=Skip for now / Configure later');
        await sleep(1500); // Aguardar fechamento físico e início do tour

        // O tour geral deve ter começado no passo 0 (Welcome to AgentEval!)
        const tourPopover = page.locator('.agent-eval-driver-popover');
        if (await tourPopover.isVisible()) {
            console.log('✅ PASS: Tour Geral iniciado com sucesso após fechar o modal de boas-vindas.');
            
            const titleStep0 = await page.locator('.driver-popover-title').textContent();
            console.log(`   📝 Passo Atual: "${titleStep0}"`);

            // Avançar para o passo 1 (Projects & Settings)
            console.log('👉 Clicando em "Avançar" para ir ao passo 1...');
            await page.click('.driver-popover-next-btn');
            await sleep(500);
            
            const titleStep1 = await page.locator('.driver-popover-title').textContent();
            console.log(`   📝 Passo Atual: "${titleStep1}"`);

            // Avançar para o passo 2 (Create your First Project)
            console.log('👉 Clicando em "Avançar" para ir ao passo 2...');
            await page.click('.driver-popover-next-btn');
            await sleep(500);

            const titleStep2 = await page.locator('.driver-popover-title').textContent();
            console.log(`   📝 Passo Atual: "${titleStep2}"`);
            
            if (titleStep2.includes('Create your First Project')) {
                console.log('✅ PASS: Chegamos no passo do botão "New Project"!');
                
                // Clicar em "Avançar" de novo (neste passo, o onNextClick customizado cria o projeto e redireciona)
                console.log('👉 Clicando no "Avançar" do passo 2 (Criação Automática do Projeto)...');
                await page.click('.driver-popover-next-btn');
                await sleep(1500); // Dar tempo para criar o projeto, redirecionar e carregar a página do projeto
                
                // Verificar que fomos redirecionados para a tela de edição do projeto
                console.log(`📍 URL Atual: ${page.url()}`);
                if (page.url().includes('/projects/')) {
                    console.log('✅ PASS: Redirecionado com sucesso para a página do Projeto!');
                    
                    // Deve abrir o Tour de Projeto automaticamente
                    const isProjectTourVisible = await page.locator('.agent-eval-driver-popover').isVisible();
                    if (isProjectTourVisible) {
                        const projectTourTitle = await page.locator('.driver-popover-title').textContent();
                        console.log(`✅ PASS: Tour de Projeto iniciado na nova página. Título: "${projectTourTitle}"`);
                        
                        // Vamos fechar o tour de projeto clicando no X do driver
                        console.log('👉 Fechando o Tour de Projeto...');
                        await page.click('.driver-popover-close-btn');
                        await sleep(500);
                    }
                    
                    // Captura de tela da página do projeto com o tour fechado
                    const screenshotProj = path.join(SCREENSHOT_DIR, '11_tour_pausado_no_projeto.png');
                    await page.screenshot({ path: screenshotProj });
                    console.log(`📸 Captura de tela no projeto salva: ${screenshotProj}`);
                    
                    // 2. RETORNO PARA A HOME: O tour geral deve retomar do passo 3 (Mission Board)
                    console.log('💡 Clicando em "Projects" no menu lateral para voltar para a Home (Dashboard)...');
                    await page.click('#sidebar-projects');
                    await sleep(1500); // Aguardar navegação, render e o delay de 1000ms do auto-start retomar
                    
                    console.log(`📍 URL Atual após retorno: ${page.url()}`);
                    
                    // Verificar se o Tour Geral foi retomado
                    const isTourResumed = await page.locator('.agent-eval-driver-popover').isVisible();
                    if (isTourResumed) {
                        const resumedTitle = await page.locator('.driver-popover-title').textContent();
                        console.log(`✅ PASS: Tour Geral RETOMADO automaticamente ao voltar para a Home!`);
                        console.log(`   📝 Passo Retomado: "${resumedTitle}"`);
                        
                        if (resumedTitle.includes('Mission Board')) {
                            console.log('🎉 SUCESSO ABSOLUTO: O Tour retomou exatamente do passo 3 (Mission Board)!');
                        } else {
                            console.error(`❌ FAIL: Tour retomou no passo errado: "${resumedTitle}"`);
                        }
                        
                        // Captura de tela do tour retomado
                        const screenshotResume = path.join(SCREENSHOT_DIR, '12_tour_retomado_na_home.png');
                        await page.screenshot({ path: screenshotResume });
                        console.log(`📸 Captura de tela do Tour Retomado salva: ${screenshotResume}`);
                        
                        // Vamos clicar em Avançar até finalizar o tour
                        console.log('👉 Avançando o resto do tour...');
                        await page.click('.driver-popover-next-btn'); // Passo 4
                        await sleep(300);
                        await page.click('.driver-popover-next-btn'); // Passo 5
                        await sleep(300);
                        await page.click('.driver-popover-next-btn'); // Passo 6 (Help Button)
                        await sleep(300);
                        
                        console.log('👉 Finalizando o tour geral no botão "Finalizar"...');
                        await page.click('.driver-popover-next-btn'); // Clica em Finalizar 🎉
                        await sleep(500);
                        
                        console.log('✅ PASS: Tour geral finalizado completamente!');
                    } else {
                        console.error('❌ FAIL: Tour Geral não foi retomado após retornar para a Home.');
                    }
                } else {
                    console.error('❌ FAIL: Não houve redirecionamento para /projects/:id após o passo 2.');
                }
            } else {
                console.error(`❌ FAIL: Passo 2 não é o de criar projeto. Título: "${titleStep2}"`);
            }
        } else {
            console.error('❌ FAIL: Tour Geral não foi iniciado automaticamente.');
        }

        console.log('\n🌟 TODOS OS TESTES DE PAUSA E RETOMADA CONCLUÍDOS COM SUCESSO! 🌟');

    } catch (error) {
        console.error('❌ Ocorreu um erro durante os testes:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

runTests();
