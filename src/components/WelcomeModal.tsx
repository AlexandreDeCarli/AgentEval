import React, { useState, useEffect } from 'react';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { 
    X, 
    Linkedin, 
    Github, 
    Coffee, 
    Sparkles, 
    User, 
    ArrowRight, 
    ExternalLink, 
    Globe,
    Eye,
    EyeOff,
    Key,
    Shield,
    ChevronLeft
} from 'lucide-react';

type ModalStep = 'welcome' | 'terms' | 'apiKey';

export const WelcomeModal: React.FC = () => {
    const {
        isHydrated,
        hasCompletedWelcomeModal,
        setHasCompletedWelcomeModal,
        showWelcomeModal,
        setShowWelcomeModal,
        triggerTour
    } = useOnboardingStore();

    const { geminiApiKey, setGeminiApiKey } = useSettingsStore();

    // Controle de estados do Wizard
    const [step, setStep] = useState<ModalStep>('welcome');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Inicializa o input de API Key com o valor atual do store ao exibir o modal
    useEffect(() => {
        if (isHydrated && (showWelcomeModal || !hasCompletedWelcomeModal)) {
            setApiKeyInput(geminiApiKey || '');
            setStep('welcome');
            setAcceptedTerms(false);
            setShowPassword(false);
        }
    }, [showWelcomeModal, hasCompletedWelcomeModal, geminiApiKey, isHydrated]);

    // Determina se o modal deve estar visível
    const isVisible = isHydrated && (!hasCompletedWelcomeModal || showWelcomeModal);

    if (!isVisible) return null;

    // Controla o fechamento geral do Onboarding
    const handleCloseOnboarding = (startTutorial: boolean) => {
        const isFirstTime = !hasCompletedWelcomeModal;

        if (isFirstTime) {
            setHasCompletedWelcomeModal(true);
            setShowWelcomeModal(false);
            // Sempre dispara o tutorial guiado no primeiro acesso
            triggerTour();
        } else {
            setShowWelcomeModal(false);
            if (startTutorial) {
                triggerTour();
            }
        }
    };

    // Handler para avançar ou fechar com base em ações do "X" ou botões secundários
    const handleCloseButtonClick = () => {
        const isFirstTime = !hasCompletedWelcomeModal;

        if (isFirstTime) {
            // No primeiro acesso, o "X" instiga o progresso pelas etapas essenciais
            if (step === 'welcome') {
                setStep('terms');
            } else if (step === 'terms') {
                // Se já estiver em termos, o "X" só fecha se aceitar, senão avisa. 
                // Para não travar no primeiro uso, avançamos para a API Key
                setStep('apiKey');
            } else {
                // Na API key, o "X" fecha e inicia o tour (não bloqueante)
                handleCloseOnboarding(true);
            }
        } else {
            // Em acessos manuais subsequentes, o "X" simplesmente fecha na hora
            setShowWelcomeModal(false);
        }
    };

    // Handler para salvar a API Key e concluir
    const handleSaveAndFinish = () => {
        setGeminiApiKey(apiKeyInput.trim());
        handleCloseOnboarding(true);
    };

    // Handler para pular a configuração de API Key
    const handleSkip = () => {
        handleCloseOnboarding(true);
    };

    // Handler para retroceder etapas
    const handleBackStep = () => {
        if (step === 'apiKey') {
            setStep('terms');
        } else if (step === 'terms') {
            setStep('welcome');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop com desfoque e animação suave */}
            <div 
                className="absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-300 animate-modal-fade-in cursor-pointer"
                onClick={() => {
                    // Impede o fechamento acidental clicando fora no primeiro acesso sem passar pelo fluxo
                    if (hasCompletedWelcomeModal) {
                        setShowWelcomeModal(false);
                    }
                }}
            />

            {/* Caixa do Modal Premium */}
            <div className="relative bg-gradient-to-b from-[#111827] to-[#0b0f19] border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.8),_inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl max-w-2xl w-full p-8 z-10 animate-modal-scale-in overflow-hidden">
                
                {/* Linha de brilho superior */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                
                {/* Botão de Voltar no Topo Esquerdo */}
                {step !== 'welcome' && (
                    <button
                        onClick={handleBackStep}
                        className="absolute top-4 left-4 p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all duration-200 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        aria-label="Voltar"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Voltar</span>
                    </button>
                )}

                {/* Botão de Fechar no Topo Direito (Exibido apenas em aberturas manuais após o primeiro acesso) */}
                {hasCompletedWelcomeModal && (
                    <button
                        onClick={handleCloseButtonClick}
                        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all duration-200 cursor-pointer"
                        aria-label="Fechar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}

                {/* --- ETAPA 1: APRESENTAÇÃO --- */}
                {step === 'welcome' && (
                    <div className="space-y-6">
                        {/* Grid de Conteúdo de Duas Colunas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left pt-2">
                            
                            {/* Coluna da Esquerda: Sobre o Projeto */}
                            <div className="space-y-4 pr-0 md:pr-4 border-r-0 md:border-r border-white/[0.06]">
                                <div className="flex items-center gap-2 text-primary">
                                    <Sparkles className="w-5 h-5 animate-pulse" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Sobre o Projeto</span>
                                </div>
                                
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                        AgentEval
                                    </h2>
                                    <p className="text-xs text-primary/80 font-semibold tracking-wide">
                                        Plataforma Premium de Avaliação de Agentes IA
                                    </p>
                                </div>

                                <p className="text-xs text-slate-300 leading-relaxed">
                                    O <strong>AgentEval</strong> é um ecossistema projetado para estruturar, executar e analisar testes automatizados de controle de qualidade (QA) em agentes baseados em LLMs.
                                </p>

                                <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
                                    <div className="flex gap-2.5 items-start">
                                        <span className="text-primary mt-0.5">✔</span>
                                        <p><strong>Avaliador Inteligente:</strong> O Gemini age como um usuário simulado, testando o agente e pontuando critérios complexos.</p>
                                    </div>
                                    <div className="flex gap-2.5 items-start">
                                        <span className="text-primary mt-0.5">✔</span>
                                        <p><strong>Flexibilidade de Alvos:</strong> Suporta testes diretos no Gemini ou conexões a APIs externas via requisições HTTP configuráveis.</p>
                                    </div>
                                    <div className="flex gap-2.5 items-start">
                                        <span className="text-primary mt-0.5">✔</span>
                                        <p><strong>Variáveis e Critérios:</strong> Defina cenários parametrizados e regras estritas de sucesso/falha de maneira visual.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Coluna da Direita: Sobre o Desenvolvedor */}
                            <div className="space-y-5 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-indigo-400">
                                        <User className="w-5 h-5" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Desenvolvedor</span>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold text-white">Alexandre De Carli</h3>
                                        <p className="text-xs text-indigo-300 font-semibold tracking-wide">
                                            Empreendedor, Gestor de Produtos e Engenheiro de Software
                                        </p>
                                    </div>

                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        Sou apaixonado por projetar interfaces fluidas, integrar fluxos inteligentes de IA e desenvolver arquiteturas web de ponta que encantam os usuários.
                                    </p>
                                </div>

                                {/* Badges de Conexão e Apoio */}
                                <div className="space-y-2 pt-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Conecte-se comigo</span>
                                    
                                    <div className="flex flex-col gap-2">
                                        <a 
                                            href="https://potencial.tec.br" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-emerald-500/10 hover:border-emerald-500/40 text-slate-300 hover:text-white text-xs font-semibold transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <Globe className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                                                <span>potencial.tec.br</span>
                                            </div>
                                            <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                                        </a>

                                        <a 
                                            href="https://www.linkedin.com/in/alexandredecarli/" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-[#0077b5]/10 hover:border-[#0077b5]/40 text-slate-300 hover:text-white text-xs font-semibold transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <Linkedin className="w-4 h-4 text-[#0077b5] group-hover:scale-110 transition-transform" />
                                                <span>LinkedIn</span>
                                            </div>
                                            <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                                        </a>

                                        <a 
                                            href="https://github.com/AlexandreDeCarli" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.08] hover:border-slate-500/40 text-slate-300 hover:text-white text-xs font-semibold transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <Github className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                                                <span>GitHub</span>
                                            </div>
                                            <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                                        </a>

                                        <a 
                                            href="https://www.buymeacoffee.com/AlexandreDeCarli" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-[#ffdd00]/10 hover:border-[#ffdd00]/40 text-slate-300 hover:text-[#ffdd00] text-xs font-semibold transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <Coffee className="w-4 h-4 text-[#ffdd00] group-hover:scale-110 transition-transform" />
                                                <span>Apoie no Buy Me a Coffee</span>
                                            </div>
                                            <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Botão Central de Avanço */}
                        <div className="pt-4 flex flex-col items-center">
                            <button
                                onClick={() => setStep('terms')}
                                className="w-full max-w-sm px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary to-violet-500 hover:from-primary/95 hover:to-violet-400 text-white font-bold text-sm tracking-wide uppercase shadow-[0_4px_20px_rgba(var(--primary-rgb),0.25)] hover:shadow-[0_4px_25px_rgba(var(--primary-rgb),0.35)] hover:-translate-y-[1px] transition-all duration-200 cursor-pointer active:scale-[0.98] active:translate-y-0 flex items-center justify-center gap-2 group"
                            >
                                <span>Iniciar Tutorial</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                )}

                {/* --- ETAPA 2: TERMOS DE USO --- */}
                {step === 'terms' && (
                    <div className="space-y-6 pt-2 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
                                <Shield className="w-6 h-6 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight text-white mt-2">
                                Termos de Uso e Responsabilidade
                            </h2>
                            <p className="text-xs text-primary/80 font-semibold tracking-wide uppercase">
                                Leia e confirme os limites de responsabilidade antes de usar
                            </p>
                        </div>

                        {/* Caixa de Texto com Scroll Estilizado */}
                        <div className="overflow-y-auto max-h-56 pr-2 border border-white/[0.08] bg-white/[0.01] p-4 rounded-xl text-xs text-slate-300 leading-relaxed space-y-4 text-left custom-scrollbar">
                            <p>
                                Bem-vindo ao <strong>AgentEval</strong>! Antes de prosseguir e iniciar o tutorial, é necessário ler e aceitar as condições de uso, privacidade e limites de responsabilidade estabelecidos para a ferramenta.
                            </p>
                            
                            <h4 className="font-bold text-white text-[11px] uppercase tracking-wider">1. Gratuidade da Ferramenta</h4>
                            <p>
                                O AgentEval é fornecido como uma ferramenta de software de uso inteiramente <strong>gratuito e de código aberto</strong>, projetada para auxiliar desenvolvedores e analistas de qualidade (QA) no teste automatizado de fluxos de conversação de inteligência artificial.
                            </p>
                            
                            <h4 className="font-bold text-white text-[11px] uppercase tracking-wider">2. Política de Não-Coleta de Dados</h4>
                            <p>
                                🔒 <strong>Privacidade Total:</strong> Nós prezamos severamente pela privacidade dos seus dados e infraestrutura. O AgentEval opera de maneira <strong>100% autônoma e puramente local</strong> em seu navegador e máquina de desenvolvimento. <strong>Nenhum dado</strong>, chave de API, projeto cadastrado, prompt do sistema ou histórico de execuções é enviado ou armazenado em servidores externos administrados pelo desenvolvedor do AgentEval ou por quaisquer terceiros.
                            </p>
                            
                            <h4 className="font-bold text-white text-[11px] uppercase tracking-wider">3. Limitação de Responsabilidades</h4>
                            <p>
                                O uso do software ocorre por sua exclusiva conta e risco. O desenvolvedor do AgentEval <strong>não possui qualquer tipo de responsabilidade ou obrigação legal</strong> em casos de:
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Custos de Tokens de APIs Externas:</strong> Cobranças acumuladas ou faturamentos elevados devido ao uso de suas chaves de API próprias (como o Google Gemini API) nas execuções de testes.</li>
                                <li><strong>Falhas ou Erros de Software:</strong> Perdas de dados, interrupções ou resultados imprecisos produzidos pela plataforma de avaliações.</li>
                                <li><strong>Uso Indevido:</strong> Decisões de implantação de códigos em produção tomadas com base nas pontuações geradas de forma autônoma pelo avaliador inteligente do software.</li>
                            </ul>
                            
                            <h4 className="font-bold text-white text-[11px] uppercase tracking-wider">4. Independência Contratual das Tecnologias</h4>
                            <p>
                                O AgentEval faz uso de bibliotecas e serviços de empresas parceiras de tecnologia (como Google Gemini API, Tailwind, React, etc.). Cada uma destas empresas opera seus próprios termos de serviço e políticas de privacidade independentes. O AgentEval <strong>não se relaciona e não compartilha responsabilidade contratual</strong> com nenhuma destas marcas integradas pelo usuário.
                            </p>
                        </div>

                        {/* Checkbox de Consentimento */}
                        <div className="flex items-center gap-3 justify-center pt-2">
                            <input 
                                type="checkbox" 
                                id="accept-terms-checkbox"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                className="w-4.5 h-4.5 rounded border-white/20 bg-[#111827] text-primary focus:ring-primary/40 cursor-pointer"
                            />
                            <label htmlFor="accept-terms-checkbox" className="text-xs text-slate-300 cursor-pointer select-none">
                                Li e concordo com os Termos de Uso e Política de Privacidade do AgentEval.
                            </label>
                        </div>

                        {/* Botão de Avanço */}
                        <div className="pt-2 flex flex-col items-center">
                            <button
                                disabled={!acceptedTerms}
                                onClick={() => setStep('apiKey')}
                                className={`w-full max-w-sm px-6 py-3.5 rounded-xl text-white font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 group transition-all duration-200 cursor-pointer ${
                                    acceptedTerms 
                                    ? 'bg-gradient-to-r from-primary to-violet-500 hover:from-primary/95 hover:to-violet-400 shadow-[0_4px_20px_rgba(var(--primary-rgb),0.25)] hover:shadow-[0_4px_25px_rgba(var(--primary-rgb),0.35)] hover:-translate-y-[1px] active:scale-[0.98]'
                                    : 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed opacity-50'
                                }`}
                            >
                                <span>Aceitar e Avançar</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                )}

                {/* --- ETAPA 3: CONFIGURAÇÃO API KEY --- */}
                {step === 'apiKey' && (
                    <div className="space-y-6 pt-2 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                                <Key className="w-6 h-6 text-amber-400" />
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight text-white mt-2">
                                Gemini API Key (Chave do Avaliador)
                            </h2>
                            <p className="text-xs text-amber-400/80 font-semibold tracking-wide uppercase">
                                Necessário para executar simulações de testes inteligentes
                            </p>
                        </div>

                        {/* Card Explicativo de Privacidade Local */}
                        <div className="border border-amber-500/10 bg-amber-500/[0.03] p-4 rounded-xl text-left text-xs leading-relaxed text-slate-300 space-y-2 max-w-lg mx-auto">
                            <p>
                                O AgentEval usa o <strong>Gemini 2.5 Pro</strong> de forma inteligente para interagir com o seu agente simulando mensagens e avaliando os critérios de sucesso estabelecidos.
                            </p>
                            <p className="text-[11px] text-amber-400/90 font-medium">
                                🔒 <strong>Segurança local garantida:</strong> Graças à nossa persistência transparente, sua chave de API é criptografada e armazenada apenas localmente no seu dispositivo. Ela <strong>nunca</strong> será transmitida para nossos servidores ou para fora da sua máquina.
                            </p>
                        </div>

                        {/* Campo de Input de Chave */}
                        <div className="space-y-2 text-left max-w-lg mx-auto">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Gemini API Key
                                </label>
                                <a 
                                    href="https://aistudio.google.com/" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-[10px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors group"
                                >
                                    <span>Obter chave gratuita no AI Studio</span>
                                    <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                </a>
                            </div>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Cole sua chave de API aqui (ex: AIzaSy...)"
                                    value={apiKeyInput}
                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                    className="w-full bg-[#0b0f19]/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent placeholder:text-slate-600 transition-all font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Botões Finais de Confirmação */}
                        <div className="pt-2 flex flex-col items-center gap-3">
                            <button
                                onClick={handleSaveAndFinish}
                                className="w-full max-w-sm px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary to-violet-500 hover:from-primary/95 hover:to-violet-400 text-white font-bold text-sm tracking-wide uppercase shadow-[0_4px_20px_rgba(var(--primary-rgb),0.25)] hover:shadow-[0_4px_25px_rgba(var(--primary-rgb),0.35)] hover:-translate-y-[1px] transition-all duration-200 cursor-pointer active:scale-[0.98] active:translate-y-0 flex items-center justify-center gap-2 group"
                            >
                                <span>Salvar e Iniciar Onboarding</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                            
                            <button
                                onClick={handleSkip}
                                className="text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors cursor-pointer"
                            >
                                Pular por enquanto / Configurar depois
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
