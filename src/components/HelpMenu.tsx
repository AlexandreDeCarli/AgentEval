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
        { id: 'quickstart', label: 'Quick Guide', icon: <Compass className="w-4 h-4" /> },
        { id: 'concepts', label: 'Concepts', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'tips', label: 'Tips & Variables', icon: <Lightbulb className="w-4 h-4" /> },
        { id: 'faq', label: 'FAQ', icon: <HelpCircle className="w-4 h-4" /> },
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
                        <h2 className="text-xl font-bold tracking-tight">Help & Learning</h2>
                    </div>
                    <button
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
                        onClick={() => setShowHelpMenu(false)}
                        aria-label="Close"
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
                                <h3 className="text-lg font-semibold text-foreground mb-2">Welcome to AgentEval!</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    This platform allows you to define goals and evaluate AI agent behavior in a systematic and automated way.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary/80">Recommended Flow</h4>
                                
                                <div className="flex gap-4 p-3 rounded-lg border border-border/60 hover:border-border bg-muted/20 transition-all">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0 text-sm">1</div>
                                    <div>
                                        <h5 className="font-semibold text-sm">Configure your API Key</h5>
                                        <p className="text-xs text-muted-foreground mt-1">Go to Settings and insert your Gemini API Key to enable test execution.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 p-3 rounded-lg border border-border/60 hover:border-border bg-muted/20 transition-all">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0 text-sm">2</div>
                                    <div>
                                        <h5 className="font-semibold text-sm">Create or Adjust a Project</h5>
                                        <p className="text-xs text-muted-foreground mt-1">Projects organize system prompts, agent server paths (endpoints), and environment variables.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 p-3 rounded-lg border border-border/60 hover:border-border bg-muted/20 transition-all">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0 text-sm">3</div>
                                    <div>
                                        <h5 className="font-semibold text-sm">Create a Test Mission</h5>
                                        <p className="text-xs text-muted-foreground mt-1">Define the test scenario, agent goal, initial user prompts, and validation criteria.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 p-3 rounded-lg border border-border/60 hover:border-border bg-muted/20 transition-all">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0 text-sm">4</div>
                                    <div>
                                        <h5 className="font-semibold text-sm">Run the Mission</h5>
                                        <p className="text-xs text-muted-foreground mt-1">Start the execution and watch the evaluator chat with your agent in real time until it reaches the goal or fails!</p>
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
                                    Projects
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    A <strong>Project</strong> is the main container. It groups different <strong>System Prompts</strong> (which define your agent's basic behavior) and <strong>Environments</strong> (server URLs to which tests will send HTTP requests).
                                </p>
                            </div>

                            <div className="p-4 rounded-lg border border-border/60 bg-muted/10 space-y-3">
                                <div className="flex items-center gap-2 font-semibold text-foreground">
                                    <Target className="w-4 h-4 text-primary" />
                                    Missions
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    A <strong>Mission</strong> is a specific test scenario. You define what the agent should accomplish (e.g., "buy a plane ticket") and what the success criteria are. The evaluator (Gemini) will act as a real user to test the agent.
                                </p>
                            </div>

                            <div className="p-4 rounded-lg border border-border/60 bg-muted/10 space-y-3">
                                <div className="flex items-center gap-2 font-semibold text-foreground">
                                    <Server className="w-4 h-4 text-primary" />
                                    Environments
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    They represent the communication URLs for your agent. AgentEval supports agents exposed via HTTP (which respond to messages in AgentEval's chat standard) to simulate real API flows.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TIPS & VARIABLES TAB */}
                    {activeTab === 'tips' && (
                        <div className="space-y-6 animate-fade-in text-sm">
                            <div>
                                <h3 className="text-md font-semibold text-foreground mb-2">Test Modeling Tips</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    To create robust tests that do not fail due to small variations, use dynamic variables in your missions.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary/80">Variable Syntax</h4>
                                <p className="text-xs text-muted-foreground">
                                    You can parameterize missions by defining custom variables in double curly braces, such as <code>{`{{username}}`}</code> or <code>{`{{product}}`}</code>. When running the test, actual values will replace these placeholders.
                                </p>

                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary/80">Acceptance Criteria</h4>
                                <div className="p-3 bg-muted/20 border border-border/60 rounded-md">
                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                        Be very explicit in the mission criteria. For example:<br />
                                        <span className="text-foreground font-medium">- Success: The agent provided the cancellation protocol number.</span><br />
                                        <span className="text-foreground font-medium">- Failure: The agent tried to charge improper extra fees.</span>
                                    </p>
                                </div>

                                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex gap-2">
                                    <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-primary-foreground/90">
                                        <strong>Pro Tip:</strong> Keep debug logs enabled to see exactly the HTTP payload sent to your agent if API calls return an error!
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
                                    Why do I need a Gemini API Key?
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    AgentEval uses high-performance Gemini models to act as the "Evaluator", simulating conversations with the agent and analyzing criteria compliance. Without the key configured in the Settings tab, tests cannot be started.
                                </p>
                            </div>

                            <div className="border-b border-border/60 pb-3">
                                <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                                    <ChevronRight className="w-4 h-4 text-primary" />
                                    How should my agent expose the API?
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    Your agent must respond to POST requests containing the message history and return a JSON with the textual response in the format accepted by AgentEval.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                                    <ChevronRight className="w-4 h-4 text-primary" />
                                    Where are my data saved?
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    In the development environment, data is saved locally in JSON files inside the project folder. In the production build, they are securely stored in your browser's <code>localStorage</code>.
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
                                className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 text-sm font-semibold hover:bg-primary/95 transition-all shadow-md active:scale-[0.98] cursor-pointer"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                Start Project Tour
                            </button>
                            <button
                                onClick={handleRestartMainTour}
                                className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 px-4 text-sm font-medium transition-all cursor-pointer"
                            >
                                <Play className="w-4 h-4 text-muted-foreground" />
                                Start General Tour
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleRestartMainTour}
                            className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 text-sm font-semibold hover:bg-primary/95 transition-all shadow-md active:scale-[0.98] cursor-pointer"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            Start General Tour
                        </button>
                    )}
                    
                    <button
                        onClick={handleResetOnboarding}
                        className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 hover:bg-destructive/10 text-destructive text-sm font-semibold transition-all cursor-pointer"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset Tutorials History
                    </button>

                    <button
                        onClick={() => setShowHelpMenu(false)}
                        className="w-full inline-flex h-10 items-center justify-center rounded-lg border border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 px-4 text-sm font-medium transition-all cursor-pointer"
                    >
                        Close Help
                    </button>
                </div>

            </div>
        </div>
    );
};
