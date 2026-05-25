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
        hasCompletedMissionOnboarding,
        setHasCompletedMissionOnboarding,
        hasCompletedWelcomeModal,
        tourTriggerCount,
        projectTourTriggerCount,
        missionTourTriggerCount,
        isHydrated,
        setDashboardTourCurrentStep
    } = useOnboardingStore();
    
    const { addProject, projects } = useProjectStore();
    
    const navigate = useNavigate();
    const location = useLocation();
    
    // Tracks if auto-start has already run during this component session to prevent duplicates
    const hasAutoStartedDashboard = useRef(false);
    const hasAutoStartedProject = useRef(false);
    const hasAutoStartedMission = useRef(false);

    // Track the last handled manual triggers to prevent navigation loop re-triggers
    const lastHandledDashboardTrigger = useRef(0);
    const lastHandledProjectTrigger = useRef(0);
    const lastHandledMissionTrigger = useRef(0);

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
                // If it is a project tab element, click it programmatically to activate
                if (element && element.id && element.id.startsWith('project-tab-')) {
                    (element as HTMLElement).click();
                }
                // If it is the mission list card, activate the missions tab automatically
                if (element && element.id === 'project-missions-list') {
                    const missionsTab = document.getElementById('project-tab-missions');
                    if (missionsTab) missionsTab.click();
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
                    element: '#project-tab-dashboard',
                    popover: {
                        title: '📊 Project Dashboard',
                        description: 'Welcome to your analytical hub! View real-time agent performance trend charts, success rates, key metrics, and inspect the details of past runs with a single click.',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '#project-tab-missions',
                    popover: {
                        title: '🎯 Missions',
                        description: 'A Mission defines the test scenario: the conversation goal, variables, and validation criteria. You can run individual missions or execute all of them in parallel!',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '#project-tab-settings',
                    popover: {
                        title: '⚙️ Settings Tab',
                        description: 'This tab houses all the configuration options for your project, now clean and separated into dedicated sub-tabs.',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '#project-tab-info',
                    popover: {
                        title: '📝 Basic Info',
                        description: 'Configure your project\'s basic details, name, and target provider (HTTP API or direct Gemini integration).',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '#project-tab-docs',
                    popover: {
                        title: '📖 Project Documentation',
                        description: 'Write or paste the project documentation in Markdown. The evaluator will automatically read this context to verify if your agent respects domain rules and requirements.',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '#project-tab-prompts',
                    popover: {
                        title: '🎭 System Prompts',
                        description: 'Configure the guidelines and system instructions that define your AI agent\'s persona and behavior. You can add multiple prompts to test different variations!',
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
                    element: '#project-missions-list',
                    popover: {
                        title: '📋 Test Execution & Stability',
                        description: 'Here is your list of missions. Each card displays colored score pills representing the last 3 test runs to analyze agent stability over time at a glance. Click Run to execute!',
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


    // --- MISSION EDITOR TOUR ---
    const runMissionDriver = useCallback(() => {
        const driverObj = driver({
            showProgress: true,
            animate: true,
            doneBtnText: 'Finish Onboarding 🚀',
            nextBtnText: 'Next →',
            prevBtnText: '← Back',
            popoverClass: 'agent-eval-driver-popover',
            onHighlighted: () => {
                const element = driverObj.getActiveElement();
                // If it is a mission tab element, click it programmatically to activate
                if (element && element.id && element.id.startsWith('mission-tab-')) {
                    (element as HTMLElement).click();
                }
            },
            onDestroyed: () => {
                globalTourActive = false;
                activeDriverRef.current = null;
                setHasCompletedMissionOnboarding(true);
            },
            steps: [
                {
                    element: '#mission-editor-header',
                    popover: {
                        title: '🎯 Mission Editor',
                        description: 'Welcome to the Mission Editor! Here you define specific goals, variables, and evaluation criteria for testing your AI agent.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#mission-tab-goal',
                    popover: {
                        title: '📝 Mission Goal',
                        description: 'Define the objective that the AI agent needs to achieve during the conversation (e.g. negotiating a discount).',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '#mission-tab-integration',
                    popover: {
                        title: '🔌 Integration Setup',
                        description: 'Select which System Prompt to apply and which Environments are active for this specific test scenario.',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '#mission-tab-variables',
                    popover: {
                        title: '🎭 Dynamic Variables',
                        description: 'Define variables that will be dynamically injected into the mission prompt, enabling you to test multiple permutations and inputs.',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '#mission-tab-criteria',
                    popover: {
                        title: '✅ Approval Criteria',
                        description: 'Establish strict rules that the evaluator will use to grade the agent\'s conversation transcript (e.g. ensuring it didn\'t leak secrets).',
                        side: 'bottom',
                        align: 'center'
                    }
                },
                {
                    element: '#mission-save-button',
                    popover: {
                        title: '💾 Save Mission',
                        description: 'Save your configuration here, ready to run your automated AI evaluation tests!',
                        side: 'bottom',
                        align: 'center'
                    }
                }
            ]
        });

        activeDriverRef.current = driverObj;
        driverObj.drive();
    }, [setHasCompletedMissionOnboarding]);

    const startMissionTour = useCallback(() => {
        if (globalTourActive) return;
        globalTourActive = true;

        // Ensure we are inside a mission route
        if (!location.pathname.includes('/missions/')) {
            globalTourActive = false;
            return;
        }

        runMissionDriver();
    }, [location.pathname, runMissionDriver]);


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

    // 3. Mission Auto-Start (includes element checking for the manual creation method screen)
    useEffect(() => {
        const isMissionRoute = location.pathname.includes('/missions/');
        const forceStart = sessionStorage.getItem('autoStartMissionTour') === 'true';
        
        if (isHydrated && isMissionRoute) {
            if (forceStart || (!hasCompletedMissionOnboarding && !hasAutoStartedMission.current)) {
                // We check if the manual editor is in the DOM (checking #mission-editor-header)
                const checkInterval = setInterval(() => {
                    const headerElement = document.getElementById('mission-editor-header');
                    if (headerElement) {
                        clearInterval(checkInterval);
                        sessionStorage.removeItem('autoStartMissionTour');
                        hasAutoStartedMission.current = true;
                        
                        // Small delay to let React fully render the tab elements
                        setTimeout(() => {
                            startMissionTour();
                        }, 500);
                    }
                }, 200);

                return () => clearInterval(checkInterval);
            }
        }
    }, [isHydrated, location.pathname, hasCompletedMissionOnboarding, startMissionTour]);


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

    // 3. Mission Manual Trigger
    useEffect(() => {
        if (isHydrated && missionTourTriggerCount > lastHandledMissionTrigger.current) {
            lastHandledMissionTrigger.current = missionTourTriggerCount;
            // Force start flag to override auto-start refs
            sessionStorage.setItem('autoStartMissionTour', 'true');
            startMissionTour();
        }
    }, [isHydrated, missionTourTriggerCount, startMissionTour]);

    return null;
};
