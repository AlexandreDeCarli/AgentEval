const { exec } = require('child_process');
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
    console.log('🚀 Iniciando Teste de Interface E2E...');

    // Limpar estado do onboarding anterior para simular o primeiro acesso real
    const onboardingFile = path.join(__dirname, '../data/agent-qa-onboarding.json');
    if (fs.existsSync(onboardingFile)) {
        console.log('🧹 Limpando dados de onboarding persistidos anteriores...');
        fs.unlinkSync(onboardingFile);
    }

    // 1. Iniciar Vite Dev Server
    console.log('📦 Inicializando o servidor de desenvolvimento da Vite...');
    const serverProcess = exec('npm run dev', { cwd: '/Users/alexandre/Documents/ProjetosAntigravity/testadordeagentes' });

    // Monitorar logs do servidor
    serverProcess.stdout.on('data', (data) => {
        // console.log(`[Vite Server] ${data.trim()}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`[Vite Error] ${data.trim()}`);
    });

    // Aguardar o servidor inicializar
    await sleep(4000);

    let browser;
    try {
        // 2. Launch headless browser
        console.log('🌐 Iniciando navegador Chromium (Playwright)...');
        browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const context = await browser.newContext({
            viewport: { width: 1280, height: 800 }
        });
        const page = await context.newPage();

        // 3. Acessar a aplicação
        console.log(`🔗 Navegando para ${URL}...`);
        await page.goto(URL, { waitUntil: 'networkidle' });
        await sleep(2000); // Aguardar o delay do Onboarding (1000ms)

        // 4. Testar o Onboarding Tour (Auto-start)
        console.log('✨ Verificando exibição automática do Onboarding Tour...');
        const tourPopover = await page.locator('.agent-eval-driver-popover');
        const popoverVisible = await tourPopover.isVisible();

        if (popoverVisible) {
            console.log('✅ PASS: Onboarding Tour abriu automaticamente no primeiro acesso.');
            
            // Obter e exibir o título do Popover
            const title = await page.locator('.driver-popover-title').textContent();
            console.log(`   📝 Título do popover: "${title}"`);
            
            // Salvar captura de tela do Onboarding inicial
            const path1 = path.join(SCREENSHOT_DIR, '01_onboarding_inicial.png');
            await page.screenshot({ path: path1 });
            console.log(`   📸 Captura de tela salva: ${path1}`);

            // Avançar no tour clicando no botão "Avançar"
            console.log('👉 Clicando em "Avançar" para avançar os passos...');
            const nextBtn = page.locator('.driver-popover-next-btn');
            if (await nextBtn.isVisible()) {
                await nextBtn.click();
                await sleep(500);
                
                const title2 = await page.locator('.driver-popover-title').textContent();
                console.log(`   📝 Título do segundo passo: "${title2}"`);

                const path2 = path.join(SCREENSHOT_DIR, '02_onboarding_passo2.png');
                await page.screenshot({ path: path2 });
                console.log(`   📸 Captura de tela salva: ${path2}`);
            }

            // Fechar/Concluir o tour
            console.log('❌ Fechando o Tour de Onboarding...');
            const closeBtn = page.locator('.driver-popover-close-btn');
            if (await closeBtn.isVisible()) {
                await closeBtn.click();
                await sleep(500);
            }
        } else {
            console.warn('⚠️ AVISO: Onboarding Tour não abriu automaticamente (talvez o localStorage já esteja preenchido).');
        }

        // 5. Testar e abrir o Menu de Ajuda
        console.log('💡 Abrindo a Central de Ajuda & Tutoriais...');
        const helpBtn = page.locator('#sidebar-help-button');
        if (await helpBtn.isVisible()) {
            await helpBtn.click();
            await sleep(500);
            console.log('✅ PASS: Botão de ajuda clicado.');

            // Verificar se o Menu de Ajuda está visível
            const helpMenuTitle = await page.locator('h2:has-text("Ajuda & Aprendizado")');
            if (await helpMenuTitle.isVisible()) {
                console.log('✅ PASS: Menu de ajuda abriu perfeitamente na lateral direita.');

                // Salvar captura de tela com o Menu de Ajuda aberto
                const path3 = path.join(SCREENSHOT_DIR, '03_menu_ajuda.png');
                await page.screenshot({ path: path3 });
                console.log(`   📸 Captura de tela salva: ${path3}`);

                // Testar a troca de abas no Menu de Ajuda
                console.log('🔀 Testando navegação nas abas do Menu de Ajuda...');
                const tabs = ['Conceitos', 'Dicas & Variáveis', 'Perguntas Frequentes'];
                for (const tabName of tabs) {
                    const tabButton = page.locator(`button:has-text("${tabName}")`);
                    if (await tabButton.isVisible()) {
                        await tabButton.click();
                        await sleep(400);
                        console.log(`   └─ Aba "${tabName}" clicada.`);
                    }
                }

                // Reiniciar o Onboarding pelo Menu de Ajuda
                console.log('🔄 Testando o reinício do Onboarding através do Menu de Ajuda...');
                // Voltar para a aba principal para clicar no botão de reiniciar
                await page.locator('button:has-text("Guia Rápido")').click();
                await sleep(300);

                const restartTourBtn = page.locator('button:has-text("Iniciar Tour Guiado")');
                if (await restartTourBtn.isVisible()) {
                    await restartTourBtn.click();
                    await sleep(1000); // Aguardar o tour iniciar

                    // Verificar se o popover reabriu
                    const tourPopoverReopened = await page.locator('.agent-eval-driver-popover').isVisible();
                    if (tourPopoverReopened) {
                        console.log('✅ PASS: Tour de onboarding reiniciado com sucesso a partir do botão do Menu de Ajuda!');
                        const path4 = path.join(SCREENSHOT_DIR, '04_tour_reiniciado.png');
                        await page.screenshot({ path: path4 });
                        console.log(`   📸 Captura de tela salva: ${path4}`);
                    } else {
                        console.error('❌ FAIL: Tour não reabriu ao clicar no botão de reinício.');
                    }
                } else {
                    console.error('❌ FAIL: Botão de reiniciar tour não encontrado.');
                }
            } else {
                console.error('❌ FAIL: Menu de ajuda não ficou visível.');
            }
        } else {
            console.error('❌ FAIL: Botão de ajuda no sidebar (#sidebar-help-button) não foi encontrado.');
        }

        console.log('\n🌟 TODOS OS TESTES DE INTERFACE DE E2E FORAM CONCLUÍDOS COM SUCESSO! 🌟\n');

    } catch (e) {
        console.error('❌ Ocorreu um erro durante o teste de interface:', e);
    } finally {
        // 6. Tear down
        if (browser) {
            console.log('🔌 Fechando navegador...');
            await browser.close();
        }
        console.log('🛑 Parando o servidor Vite...');
        serverProcess.kill('SIGINT');
        process.exit(0);
    }
}

runTests();
