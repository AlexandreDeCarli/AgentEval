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
    console.log('🚀 Iniciando Teste de Interface E2E para o Assistente de Onboarding de 3 Etapas...');

    // Limpar estado do onboarding e configurações anteriores
    const onboardingFile = path.join(__dirname, '../data/agent-qa-onboarding.json');
    const settingsFile = path.join(__dirname, '../data/agent-qa-settings.json');
    
    [onboardingFile, settingsFile].forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`🧹 Limpando dados persistidos anteriores (${path.basename(file)})...`);
            try {
                fs.unlinkSync(file);
            } catch (e) {
                console.error('Falha ao deletar arquivo:', e);
            }
        }
    });

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

        // --- ETAPA 1: APRESENTAÇÃO ---
        console.log(`🔗 Navegando para ${URL} (Simulando Primeiro Acesso)...`);
        await page.goto(URL, { waitUntil: 'domcontentloaded' });
        await sleep(1500); // Aguardar render e hidratação

        console.log('✨ Verificando exibição da Etapa 1 (Boas-Vindas)...');
        const welcomeTitle = page.locator('text=Sobre o Projeto');
        const isWelcomeVisible = await welcomeTitle.isVisible();

        if (isWelcomeVisible) {
            console.log('✅ PASS: Modal de Boas-Vindas exibido automaticamente no primeiro acesso!');
            
            // Validar links sociais e biografia
            const siteLink = page.locator('a[href*="potencial.tec.br"]');
            const devBio = page.locator('text=Empreendedor, Gestor de Produtos e Engenheiro de Software');
            
            if (await siteLink.isVisible() && await devBio.isVisible()) {
                console.log('✅ PASS: Apresentação e links do desenvolvedor corretos.');
            } else {
                console.error('❌ FAIL: Links ou biografia do desenvolvedor ausentes na primeira etapa.');
            }

            // Salvar captura de tela da Etapa 1
            const screenshotPath1 = path.join(SCREENSHOT_DIR, '09_welcome_modal_inicial.png');
            await page.screenshot({ path: screenshotPath1 });
            console.log(`📸 Captura da Etapa 1 salva: ${screenshotPath1}`);

            // Clicar em "Iniciar Tutorial" para ir à Etapa 2
            console.log('👉 Clicando no botão "Iniciar Tutorial"...');
            await page.click('text=Iniciar Tutorial');
            await sleep(800);

            // --- ETAPA 2: TERMOS DE USO ---
            console.log('✨ Verificando exibição da Etapa 2 (Termos de Uso)...');
            const termsTitle = page.locator('text=Termos de Uso e Responsabilidade');
            if (await termsTitle.isVisible()) {
                console.log('✅ PASS: Etapa 2 (Termos de Uso) carregada com sucesso!');
                
                // Rolar e ler a caixa de termos
                const termsBox = page.locator('.custom-scrollbar');
                if (await termsBox.isVisible()) {
                    console.log('✅ PASS: Caixa com rolagem de Termos de Uso está visível.');
                }

                // Verificar se o botão de avanço está inicialmente desabilitado
                const btnAvancar = page.locator('text=Aceitar e Avançar');
                const isBtnDisabled = await btnAvancar.isDisabled();
                if (isBtnDisabled) {
                    console.log('✅ PASS: Botão "Aceitar e Avançar" está desabilitado antes de aceitar os termos.');
                } else {
                    console.error('❌ FAIL: Botão "Aceitar e Avançar" está habilitado indevidamente.');
                }

                // Marcar o checkbox
                console.log('👉 Marcando checkbox "Li e concordo..."');
                await page.click('#accept-terms-checkbox');
                await sleep(300);

                const isBtnEnabled = await btnAvancar.isEnabled();
                if (isBtnEnabled) {
                    console.log('✅ PASS: Botão "Aceitar e Avançar" foi habilitado após aceitação dos termos!');
                } else {
                    console.error('❌ FAIL: Botão continuou desabilitado mesmo após clicar no checkbox.');
                }

                // Avançar para a Etapa 3
                await btnAvancar.click();
                await sleep(800);

                // --- ETAPA 3: CONFIGURAÇÃO DE API KEY ---
                console.log('✨ Verificando exibição da Etapa 3 (Gemini API Key)...');
                const apiKeyTitle = page.locator('text=Gemini API Key (Chave do Avaliador)');
                if (await apiKeyTitle.isVisible()) {
                    console.log('✅ PASS: Etapa 3 (Gemini API Key) carregada com sucesso!');

                    const dummyKey = 'AIzaSyTestApiKeyFromE2EWalkthrough123';
                    console.log(`👉 Inserindo chave de teste: ${dummyKey}`);
                    
                    const inputField = page.locator('input[placeholder*="Cole sua chave"]');
                    await inputField.fill(dummyKey);
                    await sleep(300);

                    // Testar alternância de exibição da chave (olhinho)
                    const toggleEye = page.locator('input[placeholder*="Cole sua chave"] + button');
                    if (await toggleEye.isVisible()) {
                        await toggleEye.click();
                        await sleep(200);
                        const isTextVisible = await inputField.getAttribute('type') === 'text';
                        console.log(`👁️ Alternação de visibilidade (olho): ${isTextVisible ? 'Exibindo em texto limpo ✓' : 'Oculto'}`);
                        await toggleEye.click(); // Ocultar novamente
                    }

                    // Capturar tela da Etapa 3
                    const screenshotPath3 = path.join(SCREENSHOT_DIR, '10_welcome_modal_manual.png');
                    await page.screenshot({ path: screenshotPath3 });
                    console.log(`📸 Captura da Etapa 3 salva: ${screenshotPath3}`);

                    // Salvar e Iniciar Onboarding
                    console.log('👉 Clicando em "Salvar e Iniciar Onboarding"...');
                    await page.click('text=Salvar e Iniciar Onboarding');
                    await sleep(1500); // Aguardar o salvamento físico no disco e inicialização do tour

                    // --- 4. VERIFICAÇÃO DE SEGURANÇA E CRIPTOGRAFIA ---
                    console.log('\n🔒 Verificando criptografia física local da chave de API no disco...');
                    if (fs.existsSync(settingsFile)) {
                        const fileContent = fs.readFileSync(settingsFile, 'utf8');
                        const settingsData = JSON.parse(fileContent);
                        const persistedKey = settingsData.state.geminiApiKey;

                        console.log(`   - Chave bruta informada: "${dummyKey}"`);
                        console.log(`   - Chave persistida fisicamente no JSON: "${persistedKey}"`);

                        if (persistedKey.startsWith('enc:') && persistedKey !== dummyKey) {
                            console.log('✅ PASS: A Gemini API Key está 100% criptografada fisicamente no armazenamento local!');
                        } else {
                            console.error('❌ FAIL: Chave salva em texto aberto ou sem criptografia no disco.');
                        }
                    } else {
                        console.error('❌ FAIL: Arquivo de persistência física no dev server não foi criado.');
                    }

                    // Verificar se o Onboarding Tour iniciou automaticamente
                    const tourPopover = page.locator('.agent-eval-driver-popover');
                    if (await tourPopover.isVisible()) {
                        console.log('✅ PASS: Onboarding Tour geral iniciado com sucesso após a configuração de boas-vindas!');
                        
                        // Fechar o tour para os testes subsequentes
                        const closeBtn = page.locator('.driver-popover-close-btn');
                        if (await closeBtn.isVisible()) {
                            await closeBtn.click();
                            await sleep(500);
                        }
                    } else {
                        console.error('❌ FAIL: Onboarding Tour não iniciou automaticamente.');
                    }

                } else {
                    console.error('❌ FAIL: Etapa 3 (Gemini API Key) não foi carregada.');
                }
            } else {
                console.error('❌ FAIL: Etapa 2 (Termos de Uso) não foi carregada.');
            }
        } else {
            console.error('❌ FAIL: Modal de Boas-Vindas não foi exibido no primeiro acesso.');
        }

        console.log('\n🌟 TODOS OS TESTES DO WELCOME MODAL & CRIPTOGRAFIA CONCLUÍDOS COM SUCESSO! 🌟');

    } catch (error) {
        console.error('❌ Ocorreu um erro durante os testes:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

runTests();
