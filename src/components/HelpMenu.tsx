import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, HelpCircle, BookOpen, Compass, Lightbulb, Play, ChevronRight, Server, FolderOpen, Target, RotateCcw, FileText } from 'lucide-react';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useProjectStore } from '../store/useProjectStore';
import { useMissionStore } from '../store/useMissionStore';
import { fileStorage } from '../utils/fileStorage';

export const HelpMenu: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const { 
        showHelpMenu, 
        setShowHelpMenu, 
        triggerTour,
        triggerProjectTour,
        triggerMissionTour
    } = useOnboardingStore();
    
    const { projects, addProject } = useProjectStore();
    const { missions, addMission } = useMissionStore();
    
    const [activeTab, setActiveTab] = useState<'quickstart' | 'concepts' | 'tips' | 'faq' | 'tours'>('quickstart');

    const handleResetOnboarding = async () => {
        sessionStorage.setItem('autoStartDashboardTour', 'true');
        
        const statePayload = JSON.stringify({
            state: {
                hasCompletedOnboarding: false,
                hasCompletedProjectOnboarding: false,
                hasCompletedMissionOnboarding: false,
                hasCompletedWelcomeModal: false,
                dashboardTourCurrentStep: 0
            },
            version: 0
        });

        try {
            await fileStorage.setItem('agent-qa-onboarding', statePayload);
        } catch (e) {
            console.warn('[HelpMenu] Erro ao persistir onboarding status:', e);
        }

        try {
            localStorage.setItem('agent-qa-onboarding', statePayload);
        } catch (e) {
            // Ignore localStorage errors
        }

        setTimeout(() => {
            if (location.pathname === '/') {
                window.location.reload();
            } else {
                window.location.href = '/';
            }
        }, 300);
    };

    if (!showHelpMenu) return null;

    const tabs = [
        { id: 'quickstart', label: 'Quick Guide', icon: <Compass className="w-3.5 h-3.5" /> },
        { id: 'concepts', label: 'Concepts Directory', icon: <BookOpen className="w-3.5 h-3.5" /> },
        { id: 'tips', label: 'Tips & Variables', icon: <Lightbulb className="w-3.5 h-3.5" /> },
        { id: 'faq', label: 'FAQ', icon: <HelpCircle className="w-3.5 h-3.5" /> },
        { id: 'tours', label: 'Interactive Tours', icon: <Play className="w-3.5 h-3.5 fill-current" /> },
    ] as const;

    const handleStartGeneralTour = () => {
        setShowHelpMenu(false);
        if (location.pathname === '/') {
            setTimeout(() => {
                triggerTour();
            }, 300);
        } else {
            sessionStorage.setItem('autoStartDashboardTour', 'true');
            navigate('/');
        }
    };

    const handleStartProjectTourDirect = () => {
        setShowHelpMenu(false);
        
        // Find or create project
        let targetProjectId = projects[0]?.id;
        if (!targetProjectId) {
            const id = crypto.randomUUID();
            addProject({
                id,
                name: 'Demo Project',
                description: 'Automatically created for the workspace interactive tour.',
                documentation: '# Project Documentation\nWelcome to your new project.',
                target_provider: 'http',
                target_gemini_model: 'gemini-1.5-flash',
                system_prompts: [],
                environments: [],
            });
            targetProjectId = id;
        }

        if (location.pathname.startsWith('/projects/')) {
            setTimeout(() => {
                triggerProjectTour();
            }, 300);
        } else {
            sessionStorage.setItem('autoStartProjectTour', 'true');
            navigate(`/projects/${targetProjectId}`);
        }
    };

    const handleStartMissionTourDirect = () => {
        setShowHelpMenu(false);
        
        // Find or create project & mission
        let targetProjectId = projects[0]?.id;
        if (!targetProjectId) {
            const pid = crypto.randomUUID();
            addProject({
                id: pid,
                name: 'Demo Project',
                description: 'Automatically created for the workspace interactive tour.',
                documentation: '# Project Documentation\nWelcome to your new project.',
                target_provider: 'http',
                target_gemini_model: 'gemini-1.5-flash',
                system_prompts: [],
                environments: [],
            });
            targetProjectId = pid;
        }

        // Find or create mission
        let targetMissionId = missions.find(m => m.project_id === targetProjectId)?.id;
        if (!targetMissionId) {
            const mid = crypto.randomUUID();
            addMission({
                id: mid,
                project_id: targetProjectId,
                titulo: 'Demo Mission',
                mission_goal: 'Test if the AI agent behaves appropriately.',
                target_system_prompt: 'You are a helpful assistant.',
                tester_persona: 'You are a curious customer.',
                max_turns: 10,
                variables: {},
                evaluation_criteria: [],
                api_config: { 
                    post_url: '', 
                    get_url: '', 
                    auth_header: '', 
                    payload_template: '', 
                    response_path: '', 
                    polling_interval: 1000, 
                    max_timeout: 5000 
                },
            });
            targetMissionId = mid;
        }

        if (location.pathname.includes('/missions/')) {
            setTimeout(() => {
                triggerMissionTour();
            }, 300);
        } else {
            sessionStorage.setItem('autoStartMissionTour', 'true');
            navigate(`/missions/${targetMissionId}`);
        }
        
        navigate(`/missions/${targetMissionId}`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0B0F19]/80 backdrop-blur-lg animate-fade-in">
            {/* Backdrop click to close */}
            <div 
                className="absolute inset-0 cursor-pointer"
                onClick={() => setShowHelpMenu(false)}
            />

            {/* Premium Full-Screen Box */}
            <div className="relative w-full max-w-5xl h-[85vh] bg-[#1C2026] border border-white/[0.08] shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-modal-scale-in z-10">
                {/* Glowing top line */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#4A72FF]/50 to-transparent animate-pulse" />
                
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.04] bg-[#13161B]/50 select-none">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#4A72FF]">
                            <HelpCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Help & Learning Center</h2>
                            <span className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase">Interactive Guides and Concepts Directory</span>
                        </div>
                    </div>
                    <button
                        className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all cursor-pointer"
                        onClick={() => setShowHelpMenu(false)}
                        aria-label="Close Help Center"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 2-Column Body Layout */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Column: Sidebar Navigation */}
                    <div className="w-72 border-r border-white/[0.04] bg-[#13161B]/30 p-6 flex flex-col justify-between select-none">
                        <div className="space-y-1.5">
                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-extrabold block mb-3 px-2">Learning Directory</span>
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                                        activeTab === tab.id
                                            ? 'bg-gradient-to-r from-[#4A72FF]/10 to-[#8B5CF6]/10 border-[#4A72FF]/40 text-white shadow-sm'
                                            : 'border-transparent text-muted-foreground hover:text-white hover:bg-white/[0.02]'
                                    }`}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Reset & Close Buttons in Sidebar bottom */}
                        <div className="space-y-2">
                            <button
                                onClick={handleResetOnboarding}
                                className="w-full inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive text-[10px] uppercase font-bold tracking-wider transition-all duration-200 cursor-pointer active:scale-95"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset Tutorials History
                            </button>
                            <button
                                onClick={() => setShowHelpMenu(false)}
                                className="w-full inline-flex h-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.08] text-slate-300 hover:text-white text-[10px] uppercase font-bold tracking-wider transition-all duration-200 cursor-pointer active:scale-95"
                            >
                                Close Help Center
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Scrollable Rich Content */}
                    <div className="flex-1 overflow-y-auto p-8 bg-[#13161B]/10 scrollbar-thin">
                        <div className="space-y-6 max-w-3xl">
                            
                            {/* QUICKSTART TAB */}
                            {activeTab === 'quickstart' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div>
                                        <h3 className="text-xl font-bold text-white uppercase tracking-wide">Welcome to AgentEval!</h3>
                                        <p className="text-xs text-slate-300 leading-relaxed mt-2">
                                            AgentEval is a state-of-the-art developer sandbox designed to evaluate AI agent behaviors systematically. By modeling test missions and leveraging LLM-based intelligent evaluators, you can run conversations, inspect raw API request histories, and guarantee agent alignment with zero manual testing overhead.
                                        </p>
                                    </div>
                                    <div className="space-y-3.5">
                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#4A72FF] select-none">Recommended Evaluation Pipeline</h4>
                                        
                                        <div className="flex gap-4 p-4 rounded-xl border border-white/[0.04] bg-[#1C2026] shadow-sm select-none">
                                            <div className="w-8 h-8 rounded-lg bg-[#4A72FF]/10 border border-[#4A72FF]/20 text-[#4A72FF] flex items-center justify-center font-black flex-shrink-0 text-sm">1</div>
                                            <div>
                                                <h5 className="font-bold text-xs text-white uppercase tracking-wider">Configure API Keys</h5>
                                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">Enter your Gemini API key in the main system settings. This key powers the LLM evaluator that acts as the user during test simulations.</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 p-4 rounded-xl border border-white/[0.04] bg-[#1C2026] shadow-sm select-none">
                                            <div className="w-8 h-8 rounded-lg bg-[#4A72FF]/10 border border-[#4A72FF]/20 text-[#4A72FF] flex items-center justify-center font-black flex-shrink-0 text-sm">2</div>
                                            <div>
                                                <h5 className="font-bold text-xs text-white uppercase tracking-wider">Define a Project Workspace</h5>
                                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">Create a project to house your agent\'s system prompt variations, target environments (server URLs), and global documentation.</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 p-4 rounded-xl border border-white/[0.04] bg-[#1C2026] shadow-sm select-none">
                                            <div className="w-8 h-8 rounded-lg bg-[#4A72FF]/10 border border-[#4A72FF]/20 text-[#4A72FF] flex items-center justify-center font-black flex-shrink-0 text-sm">3</div>
                                            <div>
                                                <h5 className="font-bold text-xs text-white uppercase tracking-wider">Model a Test Mission</h5>
                                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">Formulate the user persona, target goals, scenario variable grids, and strict evaluation checklists for your agents.</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 p-4 rounded-xl border border-white/[0.04] bg-[#1C2026] shadow-sm select-none">
                                            <div className="w-8 h-8 rounded-lg bg-[#4A72FF]/10 border border-[#4A72FF]/20 text-[#4A72FF] flex items-center justify-center font-black flex-shrink-0 text-sm">4</div>
                                            <div>
                                                <h5 className="font-bold text-xs text-white uppercase tracking-wider">Run Executions & Inspect Logs</h5>
                                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">Watch the evaluation chat run in real time. Inspect conversational transcripts, API response payloads, and score reports upon completion.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CONCEPTS DIRECTORY TAB */}
                            {activeTab === 'concepts' && (
                                <div className="space-y-4 animate-fade-in">
                                    <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-2 select-none">Sandbox Architecture Directory</h3>
                                    
                                    <div className="p-5 rounded-xl border border-white/[0.04] bg-[#1C2026] space-y-2 select-none">
                                        <div className="flex items-center gap-2.5 font-bold text-xs text-white uppercase tracking-wider">
                                            <FolderOpen className="w-4 h-4 text-[#4A72FF]" />
                                            Projects Container
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            A <strong>Project</strong> is a complete analytical directory workspace. It groups distinct **System Prompts** (variants of the system instruction configured on the agent under test) and **Environments** (specific server endpoints representing staging, development, or production urls).
                                        </p>
                                    </div>

                                    <div className="p-5 rounded-xl border border-white/[0.04] bg-[#1C2026] space-y-2 select-none">
                                        <div className="flex items-center gap-2.5 font-bold text-xs text-white uppercase tracking-wider">
                                            <Target className="w-4 h-4 text-purple-400" />
                                            Missions Scenarios
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            A <strong>Mission</strong> is a singular behavior scenario. It defines what target goals the agent must achieve (e.g. "cancel subscription"), the starting messages, the conversational persona the evaluator will adopt, and the success parameters checkboard.
                                        </p>
                                    </div>

                                    <div className="p-5 rounded-xl border border-white/[0.04] bg-[#1C2026] space-y-2 select-none">
                                        <div className="flex items-center gap-2.5 font-bold text-xs text-white uppercase tracking-wider">
                                            <Server className="w-4 h-4 text-emerald-400" />
                                            Target Environments
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            They map communication endpoints. HTTP target provider endpoints receive history sequences of conversations and respond with JSON textual payloads, matching standard API communication protocols.
                                        </p>
                                    </div>

                                    <div className="p-5 rounded-xl border border-white/[0.04] bg-[#1C2026] space-y-2 select-none">
                                        <div className="flex items-center gap-2.5 font-bold text-xs text-white uppercase tracking-wider">
                                            <FileText className="w-4 h-4 text-amber-400" />
                                            Intelligent Evaluator
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            The <strong>Evaluator</strong> is powered by Gemini. Acting as a user, it dynamically navigates conversations, inputs values, resolves variables, and parses whether the agent has complied with the required criteria checklists.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* TIPS & VARIABLES TAB */}
                            {activeTab === 'tips' && (
                                <div className="space-y-6 animate-fade-in text-slate-300">
                                    <div>
                                        <h3 className="text-lg font-bold text-white uppercase tracking-wide select-none">Test Modeling & Dynamic Variables</h3>
                                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                                            To create robust, reusable agent evaluations without hardcoding static values, utilize dynamic variables.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#4A72FF] select-none">Double Curly Braces Variable Syntax</h4>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            Define placeholders inside your mission goal or tester instructions in double curly braces, such as <code>{`{{user_id}}`}</code>, <code>{`{{flight_code}}`}</code>, or <code>{`{{expected_refund}}`}</code>. 
                                            Under the mission's <strong>Variables Tab</strong>, map these placeholders to key-value variables. On evaluation start, AgentEval automatically interpolates them before triggering conversations.
                                        </p>

                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-purple-400 select-none">Writing Acceptance Criteria Checklist</h4>
                                        <div className="p-4 bg-[#1C2026] border border-white/[0.04] rounded-xl space-y-2 select-none">
                                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#4A72FF] block">Criteria Best Practices</span>
                                            <p className="text-xs leading-relaxed text-slate-400">
                                                Write explicit, concrete evaluation metrics. Avoid generic statements:
                                            </p>
                                            <ul className="text-xs space-y-1.5 list-disc list-inside text-slate-300">
                                                <li><strong className="text-emerald-400 font-semibold">Good:</strong> "Verify if the agent provided a 6-digit refund transaction hash."</li>
                                                <li><strong className="text-emerald-400 font-semibold">Good:</strong> "Verify if the agent refused to waive fees after being asked three times."</li>
                                                <li><strong className="text-rose-400 font-semibold">Bad:</strong> "Verify if the agent was friendly." (Hard for LLMs to align cleanly)</li>
                                            </ul>
                                        </div>

                                        <div className="p-4 bg-blue-500/[0.03] border border-blue-500/20 rounded-xl flex gap-3">
                                            <Lightbulb className="w-5 h-5 text-[#4A72FF] flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-slate-300 leading-relaxed">
                                                <strong>Pro Tip:</strong> Replicate real-world network edge cases by integrating raw request logs. The built-in <strong>API Inspector</strong> highlights exact JSON outputs, so you can easily detect malformed agent payloads!
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* FAQ TAB */}
                            {activeTab === 'faq' && (
                                <div className="space-y-5 animate-fade-in">
                                    <h3 className="text-lg font-bold text-white uppercase tracking-wide select-none">Frequently Asked Questions</h3>
                                    
                                    <div className="border-b border-white/[0.04] pb-4 space-y-1.5 select-none">
                                        <h4 className="font-bold text-white text-xs flex items-center gap-1.5 uppercase tracking-wide">
                                            <ChevronRight className="w-4 h-4 text-[#4A72FF]" />
                                            Why do I need a Gemini API Key?
                                        </h4>
                                        <p className="text-xs text-slate-400 leading-relaxed pl-5">
                                            AgentEval utilizes high-performance Gemini models to act as the "Tester Persona". Gemini drives conversations, parses the criteria compliance, and submits score metrics. Without the API key configured, evaluations cannot run.
                                        </p>
                                    </div>

                                    <div className="border-b border-white/[0.04] pb-4 space-y-1.5 select-none">
                                        <h4 className="font-bold text-white text-xs flex items-center gap-1.5 uppercase tracking-wide">
                                            <ChevronRight className="w-4 h-4 text-[#4A72FF]" />
                                            How should my agent expose its communication API?
                                        </h4>
                                        <p className="text-xs text-slate-400 leading-relaxed pl-5 font-mono">
                                            Your agent must support a POST endpoint that consumes a JSON payload with a "messages" history array (containing role: 'tester' | 'target' | 'system' and content) and returns a JSON text response block.
                                        </p>
                                    </div>

                                    <div className="space-y-1.5 select-none">
                                        <h4 className="font-bold text-white text-xs flex items-center gap-1.5 uppercase tracking-wide">
                                            <ChevronRight className="w-4 h-4 text-[#4A72FF]" />
                                            Where are my sandboxed data stored?
                                        </h4>
                                        <p className="text-xs text-slate-400 leading-relaxed pl-5">
                                            In the local development workspace environment, all JSON files are automatically saved and read inside the developer folder directory via file system endpoints. For production builds, data automatically stores securely in your browser's local <code>localStorage</code> database.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* INTERACTIVE TOURS TAB */}
                            {activeTab === 'tours' && (
                                <div className="space-y-5 animate-fade-in select-none">
                                    <div>
                                        <h3 className="text-lg font-bold text-white uppercase tracking-wide">Interactive Onboarding Tutorials</h3>
                                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                                            Launch any step-by-step interactive onboarding guide at any time. AgentEval will automatically navigate to the required pages, verify databases, set up demo parameters, and start tours cleanly!
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 pt-2">
                                        
                                        <div className="p-5 bg-[#1C2026] border border-white/[0.04] rounded-xl flex items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    General Dashboard Guide
                                                </h4>
                                                <p className="text-xs text-slate-400 leading-relaxed">Learn about the main workspace screen, active project lists, global test history logs, and settings.</p>
                                            </div>
                                            <button 
                                                onClick={handleStartGeneralTour}
                                                className="px-4 py-2 bg-[#4A72FF] hover:bg-[#3B5DD8] text-white text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                            >
                                                <Play className="w-3 h-3 fill-current" /> Start General Tour
                                            </button>
                                        </div>

                                        <div className="p-5 bg-[#1C2026] border border-white/[0.04] rounded-xl flex items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-[#4A72FF]" />
                                                    Project Workspace Guide
                                                </h4>
                                                <p className="text-xs text-slate-400 leading-relaxed">Explore the analytics dashboard, sub-tabs configuration CRUD boards, and local mission lists.</p>
                                            </div>
                                            <button 
                                                onClick={handleStartProjectTourDirect}
                                                className="px-4 py-2 bg-[#4A72FF] hover:bg-[#3B5DD8] text-white text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                            >
                                                <Play className="w-3 h-3 fill-current" /> Start Project Tour
                                            </button>
                                        </div>

                                        <div className="p-5 bg-[#1C2026] border border-white/[0.04] rounded-xl flex items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                                                    Mission Configuration Guide
                                                </h4>
                                                <p className="text-xs text-slate-400 leading-relaxed">Break down scenarios variables, tester personas, Gemini models, and criteria rules editor.</p>
                                            </div>
                                            <button 
                                                onClick={handleStartMissionTourDirect}
                                                className="px-4 py-2 bg-[#4A72FF] hover:bg-[#3B5DD8] text-white text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                            >
                                                <Play className="w-3 h-3 fill-current" /> Start Mission Tour
                                            </button>
                                        </div>

                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
