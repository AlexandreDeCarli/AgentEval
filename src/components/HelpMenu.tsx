import React, { useState } from 'react';
import { X, HelpCircle, BookOpen, Compass, Lightbulb, Play, ChevronRight, Server, FolderOpen, Target, RotateCcw } from 'lucide-react';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useLocation } from 'react-router-dom';
import { fileStorage } from '../utils/fileStorage';

export const HelpMenu: React.FC = () => {
    const { 
        showHelpMenu, 
        setShowHelpMenu, 
        triggerTour, 
        triggerProjectTour
    } = useOnboardingStore();
    const [activeTab, setActiveTab] = useState<'quickstart' | 'concepts' | 'faq' | 'tips'>('quickstart');
    const location = useLocation();

    const handleResetOnboarding = async () => {
        // Configura flag na sessionStorage para forçar a inicialização imediata e veloz do tour geral após o reload
        sessionStorage.setItem('autoStartDashboardTour', 'true');
        
        // Payload de reset contendo os estados iniciais desmarcados
        const statePayload = JSON.stringify({
            state: {
                hasCompletedOnboarding: false,
                hasCompletedProjectOnboarding: false,
                hasCompletedWelcomeModal: false,
                dashboardTourCurrentStep: 0
            },
            version: 0
        });

        try {
            // Salva no storage customizado (que usa o backend dev server)
            // Agora, como não chamamos nenhum setter do Zustand antes, haverá EXACTAMENTE UMA requisição PUT de escrita
            // sem nenhuma concorrência ou condição de corrida, garantindo sucesso absoluto no Safari.
            await fileStorage.setItem('agent-qa-onboarding', statePayload);
        } catch (e) {
            console.warn('[HelpMenu] Erro ao persistir onboarding status:', e);
        }

        // Força a escrita no localStorage diretamente por redundância extra de segurança
        try {
            localStorage.setItem('agent-qa-onboarding', statePayload);
        } catch (e) {
            // Ignora silenciosamente qualquer erro de escrita no localStorage
        }

        // Pequeno delay de 300ms para permitir que a escrita do arquivo no backend
        // seja concluída e propagada com sucesso no Safari antes do unload/reload.
        setTimeout(() => {
            if (window.location.pathname === '/') {
                window.location.reload();
            } else {
                // Se estiver em outra página (ex: editor de projeto), redireciona para a home
                // para que o Tour Geral (Dashboard) possa começar do início naturalmente.
                window.location.href = '/';
            }
        }, 300);
    };

    if (!showHelpMenu) return null;

    const tabs = [
        { id: 'quickstart', label: 'Guia Rápido', icon: <Compass className="w-4 h-4" /> },
        { id: 'concepts', label: 'Conceitos', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'tips', label: 'Dicas & Variáveis', icon: <Lightbulb className="w-4 h-4" /> },
        { id: 'faq', label: 'Perguntas Frequentes', icon: <HelpCircle className="w-4 h-4" /> },
    ] as const;

    const isProjectPage = location.pathname.startsWith('/projects/');

    const handleRestartMainTour = () => {
        setShowHelpMenu(false);
        // Small delay to ensure the menu is closed before Driver.js starts highlighting
        setTimeout(() => {
            triggerTour();
        }, 300);
    };

    const handleRestartProjectTour = () => {
        setShowHelpMenu(false);
        // Small delay to ensure the menu is closed before Driver.js starts highlighting
        setTimeout(() => {
            triggerProjectTour();
        }, 300);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop with blur and smooth fade-in */}
            <div 
                className="absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={() => setShowHelpMenu(false)}
            />

            {/* Sliding Panel */}
            <div className="relative w-full max-w-md h-full bg-card/95 border-l border-border shadow-2xl flex flex-col z-10 transition-transform duration-300 transform translate-x-0 overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-bold tracking-tight">Ajuda & Aprendizado</h2>
                    </div>
                    <button
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
                        onClick={() => setShowHelpMenu(false)}
                        aria-label="Fechar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs Selector */}
                <div className="flex border-b border-border bg-muted/10 px-2 overflow-x-auto scrollbar-none">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all duration-200 ${
                                activeTab === tab.id
                                    ? 'border-primary text-primary bg-primary/5'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* QUICKSTART TAB */}
                    {activeTab === 'quickstart' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">Bem-vindo ao AgentEval!</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Esta plataforma permite que você defina metas e avalie o comportamento de agentes de IA de forma sistemática e automatizada.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary/80">Fluxo Recomendado</h4>
                                
                                <div className="flex gap-4 p-3 rounded-lg border border-border/60 hover:border-border bg-muted/20 transition-all">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0 text-sm">1</div>
                                    <div>
                                        <h5 className="font-semibold text-sm">Configure sua API Key</h5>
                                        <p className="text-xs text-muted-foreground mt-1">Vá em Configurações (Settings) e insira sua chave da API do Gemini para habilitar a execução dos testes.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 p-3 rounded-lg border border-border/60 hover:border-border bg-muted/20 transition-all">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0 text-sm">2</div>
                                    <div>
                                        <h5 className="font-semibold text-sm">Crie ou Ajuste um Projeto</h5>
                                        <p className="text-xs text-muted-foreground mt-1">Projetos organizam prompts do sistema, caminhos dos servidores dos agentes (endpoints) e variáveis de ambiente.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 p-3 rounded-lg border border-border/60 hover:border-border bg-muted/20 transition-all">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0 text-sm">3</div>
                                    <div>
                                        <h5 className="font-semibold text-sm">Crie uma Missão de Teste</h5>
                                        <p className="text-xs text-muted-foreground mt-1">Defina o cenário de teste, o objetivo do agente, os prompts iniciais do usuário e os critérios de validação.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 p-3 rounded-lg border border-border/60 hover:border-border bg-muted/20 transition-all">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0 text-sm">4</div>
                                    <div>
                                        <h5 className="font-semibold text-sm">Rode a Missão</h5>
                                        <p className="text-xs text-muted-foreground mt-1">Inicie a execução e veja o avaliador conversar com seu agente em tempo real até atingir a meta ou falhar!</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CONCEPTS TAB */}
                    {activeTab === 'concepts' && (
                        <div className="space-y-6 animate-fade-in text-sm">
                            <div className="p-4 rounded-lg border border-border/60 bg-muted/10 space-y-3">
                                <div className="flex items-center gap-2 font-semibold text-foreground">
                                    <FolderOpen className="w-4 h-4 text-primary" />
                                    Projetos
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Um <strong>Projeto</strong> é o contêiner principal. Ele agrupa diferentes <strong>Prompts de Sistema</strong> (que definem o comportamento básico do seu agente) e <strong>Ambientes</strong> (URLs de servidores para onde os testes enviarão requisições HTTP).
                                </p>
                            </div>

                            <div className="p-4 rounded-lg border border-border/60 bg-muted/10 space-y-3">
                                <div className="flex items-center gap-2 font-semibold text-foreground">
                                    <Target className="w-4 h-4 text-primary" />
                                    Missões (Missions)
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Uma <strong>Missão</strong> é um cenário de teste específico. Você define o que o agente deve realizar (ex: "comprar uma passagem de avião") e quais são os critérios de sucesso. O avaliador (Gemini) atuará como um usuário real para testar o agente.
                                </p>
                            </div>

                            <div className="p-4 rounded-lg border border-border/60 bg-muted/10 space-y-3">
                                <div className="flex items-center gap-2 font-semibold text-foreground">
                                    <Server className="w-4 h-4 text-primary" />
                                    Ambientes (Environments)
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Representam as URLs de comunicação com seu agente. O AgentEval suporta agentes expostos via HTTP (que respondem a mensagens no padrão de chat do AgentEval) para simular fluxos reais de API.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TIPS & VARIABLES TAB */}
                    {activeTab === 'tips' && (
                        <div className="space-y-6 animate-fade-in text-sm">
                            <div>
                                <h3 className="text-md font-semibold text-foreground mb-2">Dicas de Modelagem de Testes</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Para criar testes robustos que não falhem por variações pequenas, use variáveis dinâmicas em suas missões.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary/80">Sintaxe de Variáveis</h4>
                                <p className="text-xs text-muted-foreground">
                                    Você pode parametrizar missões definindo variáveis personalizadas em chaves duplas, como <code>{`{{nome_usuario}}`}</code> ou <code>{`{{produto}}`}</code>. Ao rodar o teste, os valores reais substituirão esses placeholders.
                                </p>

                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary/80">Critérios de Aceitação</h4>
                                <div className="p-3 bg-muted/20 border border-border/60 rounded-md">
                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                        Seja muito explícito nos critérios da missão. Por exemplo:<br />
                                        <span className="text-foreground font-medium">- Sucesso: O agente forneceu o número do protocolo de cancelamento.</span><br />
                                        <span className="text-foreground font-medium">- Falha: O agente tentou cobrar taxas extras indevidas.</span>
                                    </p>
                                </div>

                                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex gap-2">
                                    <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-primary-foreground/90">
                                        <strong>Dica Pro:</strong> Deixe logs de depuração ativados para visualizar exatamente o payload HTTP enviado ao seu agente caso as chamadas de API retornem erro!
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FAQ TAB */}
                    {activeTab === 'faq' && (
                        <div className="space-y-4 animate-fade-in text-sm">
                            <div className="border-b border-border/60 pb-3">
                                <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                                    <ChevronRight className="w-4 h-4 text-primary" />
                                    Por que preciso da Gemini API Key?
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    O AgentEval utiliza modelos Gemini de alta performance para agir como o "Avaliador" (evaluator), que simula conversas com o agente e analisa o cumprimento dos critérios. Sem a chave configurada na aba Settings, os testes não poderão ser iniciados.
                                </p>
                            </div>

                            <div className="border-b border-border/60 pb-3">
                                <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                                    <ChevronRight className="w-4 h-4 text-primary" />
                                    Como meu agente deve expor a API?
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    Seu agente deve responder a requisições POST contendo o histórico de mensagens e retornar um JSON contendo a resposta textual no formato aceito pelo AgentEval.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                                    <ChevronRight className="w-4 h-4 text-primary" />
                                    Onde ficam salvos os meus dados?
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    No ambiente de desenvolvimento, os dados são salvos localmente em arquivos JSON dentro da pasta do projeto. No build de produção, eles ficam guardados com segurança no <code>localStorage</code> do seu navegador.
                                </p>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer and Actions */}
                <div className="p-6 border-t border-border bg-muted/30 space-y-3">
                    {isProjectPage ? (
                        <>
                            <button
                                onClick={handleRestartProjectTour}
                                className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 text-sm font-semibold hover:bg-primary/95 transition-all shadow-md active:scale-[0.98]"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                Iniciar Tour do Projeto
                            </button>
                            <button
                                onClick={handleRestartMainTour}
                                className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 px-4 text-sm font-medium transition-all"
                            >
                                <Play className="w-4 h-4 text-muted-foreground" />
                                Iniciar Tour Geral
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleRestartMainTour}
                            className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 text-sm font-semibold hover:bg-primary/95 transition-all shadow-md active:scale-[0.98]"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            Iniciar Tour Geral
                        </button>
                    )}
                    
                    <button
                        onClick={handleResetOnboarding}
                        className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 hover:bg-destructive/10 text-destructive text-sm font-semibold transition-all cursor-pointer"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Resetar Histórico de Tutoriais
                    </button>

                    <button
                        onClick={() => setShowHelpMenu(false)}
                        className="w-full inline-flex h-10 items-center justify-center rounded-lg border border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 px-4 text-sm font-medium transition-all cursor-pointer"
                    >
                        Fechar Ajuda
                    </button>
                </div>

            </div>
        </div>
    );
};
