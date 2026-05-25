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
    
    const { addProject, projects } = useProjectStore();
    
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
            doneBtnText: 'Finish 🎉',
            nextBtnText: 'Next →',
            prevBtnText: '← Back',
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
                        title: '🚀 Welcome to AgentEval!',
                        description: 'AgentEval is a premium platform to automatically test and evaluate AI agents (LLMs). Let us show you how it works!',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#sidebar-projects',
                    popover: {
                        title: '📂 Projects & Settings',
                        description: 'Here you manage your Projects. Each project organizes your test environments (agent endpoints) and System Prompts defining your agent\'s persona.',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#new-project-button',
                    popover: {
                        title: '➕ Create your First Project',
                        description: 'Click "New Project" to create a new project, or click "Next" so we can create one for you and start the tabs tutorial!',
                        side: 'bottom',
                        align: 'center',
                        onNextClick: (_element, _step, { driver }) => {
                            const newId = crypto.randomUUID();
                            addProject({
                                id: newId,
                                name: 'New Project',
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
                        title: '🎯 Mission Board',
                        description: 'A Mission defines the test scenario. You specify what the agent should accomplish, the test variables, and the validation criteria the evaluator will use.',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#sidebar-history',
                    popover: {
                        title: '📊 Test History',
                        description: 'Track the results of past runs. View full conversations between the evaluator and the agent, analyze errors, and check success metrics.',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#sidebar-settings',
                    popover: {
                        title: '⚙️ General Settings',
                        description: 'Before you start running tests, you will need to configure your Gemini API Key here. It powers the Intelligent Evaluator (Gemini).',
                        side: 'right',
                        align: 'start'
                    }
                },
                {
                    element: '#sidebar-help-button',
                    popover: {
                        title: '💡 Help Center',
                        description: 'Have questions or want to review concepts? Click the Help button at any time to open the quick documentation menu or restart this tour!',
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
        const projectIdMatch = location.pathname.match(/\/projects\/([^\/]+)/);
        const projectId = projectIdMatch ? projectIdMatch[1] : null;
        const project = projects.find(p => p.id === projectId);
        const isGemini = project?.target_provider === 'gemini';

        const driverObj = driver({
            showProgress: true,
            animate: true,
            doneBtnText: 'Finish Onboarding 🚀',
            nextBtnText: 'Next →',
            prevBtnText: '← Back',
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
                        title: '🛠️ Project Editor',
                        description: 'This is your project\'s configuration page. Here you define everything the AI needs to interact with and evaluate your agent. Remember to click "Save" to persist changes!',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#project-tab-info',
                    popover: {
                        title: '📝 Info & Docs (Basic Info)',
                        description: 'Define the project\'s name and description. Configure if the agent is exposed via an HTTP API or if you want to test it directly by connecting to Gemini. Paste your system\'s documentation here so the AI can generate realistic test scenarios!',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '#project-tab-prompts',
                    popover: {
                        title: '🎭 System Prompts',
                        description: 'Configure the guidelines and system instructions (System Prompts) that define your AI agent\'s persona and behavior. You can add multiple prompts to test different variations!',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                ...(!isGemini ? [{
                    element: '#project-tab-environments',
                    popover: {
                        title: '🌐 Environments',
                        description: 'Configure URLs and authentication keys of your agent\'s APIs for different environments (e.g., Staging, Production). Indispensable when the project uses the HTTP API mode!',
                        side: 'bottom',
                        align: 'center'
                    }
                }] : []),
                {
                    element: '#project-tab-missions',
                    popover: {
                        title: '🎯 Missions',
                        description: 'Here is the <strong>Test Missions</strong> tab! A mission defines the test scenario: the conversation goal, the variables to test, and the validation criteria the intelligent evaluator will check.',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '#project-mission-generator',
                    popover: {
                        title: '🤖 AI Mission Generator',
                        description: 'This is the AI creation hub! Fill in optional guidelines (e.g., "ask tricky questions", "speak informally") and click <strong>Generate</strong> for Gemini Pro to read your documentation and automatically generate complex test scenarios with variables and approval criteria!',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '#project-missions-list',
                    popover: {
                        title: '📋 Dashboard and Test Execution',
                        description: 'Here you view all registered missions. Click <strong>Run</strong> to start the automated simulation where the evaluator chats with your agent in real time and inspects whether all goals were successfully met!',
                        side: 'top',
                        align: 'center'
                    }
                }
            ] as any
        });

        activeDriverRef.current = driverObj;
        driverObj.drive();
    }, [setHasCompletedProjectOnboarding, projects, location.pathname]);

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
