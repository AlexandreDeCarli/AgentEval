import React, { useEffect, useRef, useCallback } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProjectStore } from '../store/useProjectStore';
import { DEFAULT_GEMINI_TARGET_MODEL } from '../utils/missionTarget';

// Module-level variable to guarantee only ONE Driver.js overlay instance is ever active.
// Unlike component refs, this persists across route navigations, unmounts, and re-renders.
let globalTourActive = false;

export const OnboardingTour: React.FC = () => {
    const { 
        hasCompletedOnboarding, 
        setHasCompletedOnboarding, 
        hasCompletedProjectOnboarding,
        setHasCompletedProjectOnboarding,
        hasCompletedWelcomeModal,
        tourTriggerCount,
        projectTourTriggerCount,
        isHydrated,
        setDashboardTourCurrentStep
    } = useOnboardingStore();
    
    const { addProject } = useProjectStore();
    
    const navigate = useNavigate();
    const location = useLocation();
    
    // Tracks if auto-start has already run during this component session to prevent duplicates
    const hasAutoStartedDashboard = useRef(false);
    const hasAutoStartedProject = useRef(false);

    // Track the last handled manual triggers to prevent navigation loop re-triggers
    const lastHandledDashboardTrigger = useRef(0);
    const lastHandledProjectTrigger = useRef(0);

    // Active Driver.js instance ref to allow cleanup on navigation
    const activeDriverRef = useRef<any>(null);

    // --- MAIN DASHBOARD TOUR ---
    const runDashboardDriver = useCallback(() => {
        sessionStorage.setItem('dashboardTourRunning', 'true');
        const driverObj = driver({
            showProgress: true,
            animate: true,
            doneBtnText: 'Finalizar 🎉',
            nextBtnText: 'Avançar →',
            prevBtnText: '← Voltar',
            popoverClass: 'agent-eval-driver-popover',
            onHighlighted: () => {
                const activeIndex = driverObj.getActiveIndex();
                if (activeIndex !== undefined) {
                    setDashboardTourCurrentStep(activeIndex);
                }
            },
            onDestroyed: () => {
                globalTourActive = false;
                activeDriverRef.current = null;
                
                // If it was paused for transition, do NOT mark it as completed!
                const isPaused = sessionStorage.getItem('dashboardTourPaused') === 'true';
                if (!isPaused) {
                    setHasCompletedOnboarding(true);
                    setDashboardTourCurrentStep(0);
                }
                sessionStorage.removeItem('dashboardTourRunning');
            },
            steps: [
                {
                    element: '#sidebar-header',
                    popover: {
                        title: '🚀 Bem-vindo ao AgentEval!',
                        description: 'O AgentEval é uma plataforma premium para testar e avaliar agentes de IA (LLMs) de forma automatizada. Deixe-nos te mostrar como funciona!',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#sidebar-projects',
                    popover: {
                        title: '📂 Projetos & Configurações',
                        description: 'Aqui você gerencia seus Projetos. Cada projeto organiza seus ambientes de teste (endpoints do agente) e os Prompts de Sistema que definem a persona do seu agente.',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#new-project-button',
                    popover: {
                        title: '➕ Crie seu Primeiro Projeto',
                        description: 'Clique no botão "New Project" para criar un novo projeto, ou clique em "Avançar" para criarmos um para você e iniciarmos o tutorial das abas!',
                        side: 'bottom',
                        align: 'center',
                        onNextClick: (_element, _step, { driver }) => {
                            const newId = crypto.randomUUID();
                            addProject({
                                id: newId,
                                name: 'Novo Projeto',
                                description: '',
                                documentation: '',
                                target_provider: 'http',
                                target_gemini_model: DEFAULT_GEMINI_TARGET_MODEL,
                                system_prompts: [],
                                environments: [],
                            });
                            
                            // 1. Mark that we are pausing the dashboard tour (so we don't set hasCompletedOnboarding to true in onDestroyed)
                            sessionStorage.setItem('dashboardTourPaused', 'true');
                            
                            // 2. Save the next step index so that when they resume, they start at step 3!
                            setDashboardTourCurrentStep(3);
                            
                            // Set the flag to auto-start the project tour on the new route
                            sessionStorage.setItem('autoStartProjectTour', 'true');
                            
                            // Destroy the current tour first to ensure clean state
                            driver.destroy();
                            
                            // Navigate to the newly created project
                            navigate(`/projects/${newId}`);
                        }
                    }
                },
                {
                    element: '#sidebar-missions',
                    popover: {
                        title: '🎯 Quadro de Missões',
                        description: 'Uma Missão define o cenário de teste. Você estipula o que o agente deve realizar, quais as variáveis de teste e os critérios de validação que o avaliador utilizará.',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#sidebar-history',
                    popover: {
                        title: '📊 Histórico de Testes',
                        description: 'Acompanhe o resultado das execuções passadas. Visualize conversas completas entre o avaliador e o agente, analise erros e confira as métricas de sucesso.',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#sidebar-settings',
                    popover: {
                        title: '⚙️ Configurações Gerais',
                        description: 'Antes de começar a rodar testes, você precisará configurar sua Gemini API Key aqui. Ela serve para alimentar o Avaliador Inteligente (Gemini).',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#sidebar-help-button',
                    popover: {
                        title: '💡 Central de Ajuda',
                        description: 'Ficou com alguma dúvida ou quer rever os conceitos? Clique a qualquer momento no botão de Ajuda para abrir o menu de documentação rápida ou reiniciar este tour!',
                        side: 'right',
                        align: 'start'
                    }
                }
            ]
        });

        activeDriverRef.current = driverObj;
        const savedStep = useOnboardingStore.getState().dashboardTourCurrentStep || 0;
        driverObj.drive(savedStep);
    }, [setHasCompletedOnboarding, setDashboardTourCurrentStep, addProject, navigate]);

    const startDashboardTour = useCallback(() => {
        if (globalTourActive) return;
        globalTourActive = true;

        // Ensure we are on the home page (ProjectList) since the selectors are there
        if (location.pathname !== '/') {
            navigate('/');
            setTimeout(() => runDashboardDriver(), 350);
        } else {
            runDashboardDriver();
        }
    }, [location.pathname, navigate, runDashboardDriver]);


    // --- PROJECT EDITOR TOUR ---
    const runProjectDriver = useCallback(() => {
        const driverObj = driver({
            showProgress: true,
            animate: true,
            doneBtnText: 'Finalizar Onboarding 🚀',
            nextBtnText: 'Avançar →',
            prevBtnText: '← Voltar',
            popoverClass: 'agent-eval-driver-popover',
            onHighlighted: () => {
                const element = driverObj.getActiveElement();
                // Se o elemento destacado for uma das abas do projeto, ativa-a programaticamente
                if (element && element.id && element.id.startsWith('project-tab-')) {
                    (element as HTMLElement).click();
                }
            },
            onDestroyed: () => {
                globalTourActive = false;
                activeDriverRef.current = null;
                setHasCompletedProjectOnboarding(true);
            },
            steps: [
                {
                    element: '#project-editor-header',
                    popover: {
                        title: '🛠️ Edição do Projeto',
                        description: 'Esta é a página de configuração do seu projeto. Aqui você define tudo que a IA precisa para interagir e avaliar seu agente. Lembre-se de clicar em "Save" para persistir as alterações!',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#project-tab-info',
                    popover: {
                        title: '📝 Info & Docs (Informações Básicas)',
                        description: 'Defina o nome e a descrição do projeto. Configure também se o agente é exposto por uma API HTTP ou se deseja testá-lo diretamente conectando ao Gemini. Cole a documentação do seu sistema aqui para que a IA gere cenários de teste realistas!',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '#project-tab-prompts',
                    popover: {
                        title: '🎭 System Prompts (Prompts de Sistema)',
                        description: 'Configure as diretrizes e instruções de sistema (System Prompts) que definem a persona e comportamento do seu agente de IA. Você pode adicionar múltiplos prompts para testar diferentes variações!',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '#project-tab-environments',
                    popover: {
                        title: '🌐 Ambientes (Environments)',
                        description: 'Configure as URLs e chaves de autenticação das APIs do seu agente para diferentes ambientes (ex: Staging, Production). Indispensável quando o projeto usa o modo HTTP API!',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '#project-tab-missions',
                    popover: {
                        title: '🎯 Missões (Missions)',
                        description: 'Aqui está a aba de <strong>Missões de Teste</strong>! Uma missão define o cenário do teste: o objetivo da conversa, as variáveis a testar e os critérios de validação que o avaliador inteligente verificará.',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '#project-mission-generator',
                    popover: {
                        title: '🤖 Gerador de Missões com IA',
                        description: 'Esta é a central de criação com IA! Preencha diretrizes opcionais (ex: "faça perguntas capciosas", "fale de forma informal") e clique em <strong>Generate</strong> para o Gemini Pro ler sua documentação e gerar cenários de teste complexos automaticamente com variáveis e critérios de aprovação!',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '#project-missions-list',
                    popover: {
                        title: '📋 Painel e Execução de Testes',
                        description: 'Aqui você visualiza todas as missões cadastradas. Clique em <strong>Run</strong> para iniciar a simulação automatizada onde o avaliador conversa com seu agente em tempo real e inspeciona se todas as metas foram cumpridas com sucesso!',
                        side: 'top',
                        align: 'center'
                    }
                }
            ]
        });

        activeDriverRef.current = driverObj;
        driverObj.drive();
    }, [setHasCompletedProjectOnboarding]);

    const startProjectTour = useCallback(() => {
        if (globalTourActive) return;
        globalTourActive = true;

        // Ensure we are inside a project route
        if (!location.pathname.startsWith('/projects/')) {
            globalTourActive = false;
            return;
        }

        runProjectDriver();
    }, [location.pathname, runProjectDriver]);


    // Cleanup active driver when route changes to prevent overlay staying active or double triggering
    useEffect(() => {
        if (activeDriverRef.current) {
            try {
                activeDriverRef.current.destroy();
            } catch (e) {
                console.warn('[OnboardingTour] Error destroying driver on route change:', e);
            }
            activeDriverRef.current = null;
            globalTourActive = false;
        }
    }, [location.pathname]);

    // --- EFFECTS FOR AUTO-START ---

    // 1. Dashboard Auto-Start
    useEffect(() => {
        const forceStart = sessionStorage.getItem('autoStartDashboardTour') === 'true';
        const isPaused = sessionStorage.getItem('dashboardTourPaused') === 'true';
        
        if (isHydrated && location.pathname === '/' && hasCompletedWelcomeModal) {
            if (forceStart || isPaused || (!hasCompletedOnboarding && !hasAutoStartedDashboard.current)) {
                // Clear the force & pause flags so it doesn't trigger again
                sessionStorage.removeItem('autoStartDashboardTour');
                sessionStorage.removeItem('dashboardTourPaused');
                hasAutoStartedDashboard.current = true;
                
                // Snappy delay of 300ms if forced by reset, otherwise 1000ms for first-load
                const delay = forceStart ? 300 : 1000;
                
                const timer = setTimeout(() => {
                    startDashboardTour();
                }, delay);
                return () => clearTimeout(timer);
            }
        }
    }, [isHydrated, location.pathname, hasCompletedOnboarding, hasCompletedWelcomeModal, startDashboardTour]);

    // 2. Project Auto-Start
    useEffect(() => {
        const isProjectRoute = location.pathname.startsWith('/projects/');
        const forceStart = sessionStorage.getItem('autoStartProjectTour') === 'true';
        
        if (isHydrated && isProjectRoute) {
            if (forceStart || (!hasCompletedProjectOnboarding && !hasAutoStartedProject.current)) {
                // Clear the force flag so it doesn't trigger again on refresh
                sessionStorage.removeItem('autoStartProjectTour');
                hasAutoStartedProject.current = true;
                
                const timer = setTimeout(() => {
                    startProjectTour();
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [isHydrated, location.pathname, hasCompletedProjectOnboarding, startProjectTour]);


    // --- EFFECTS FOR MANUAL TRIGGER ---

    // 1. Dashboard Manual Trigger
    useEffect(() => {
        if (isHydrated && tourTriggerCount > lastHandledDashboardTrigger.current) {
            lastHandledDashboardTrigger.current = tourTriggerCount;
            startDashboardTour();
        }
    }, [isHydrated, tourTriggerCount, startDashboardTour]);

    // 2. Project Manual Trigger
    useEffect(() => {
        if (isHydrated && projectTourTriggerCount > lastHandledProjectTrigger.current) {
            lastHandledProjectTrigger.current = projectTourTriggerCount;
            startProjectTour();
        }
    }, [isHydrated, projectTourTriggerCount, startProjectTour]);

    return null;
};
