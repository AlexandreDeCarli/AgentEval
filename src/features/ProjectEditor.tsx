import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useProjectStore } from '../store/useProjectStore';
import { useMissionStore } from '../store/useMissionStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTestExecutionStore } from '../store/useTestExecutionStore';
import { useTestRunStore } from '../store/useTestRunStore';
import { Modal } from '../components/ui/Modal';
import { EvaluationReport } from './EvaluationReport';
import { ChatBubble } from '../components/ChatBubble';
import { DebugLogPanel } from '../components/DebugLogPanel';
import { Project, Mission, TestRun } from '../types';
import { normalizeProjectTargetConfig } from '../utils/missionTarget';
import { ArrowLeft, Trash2, TrendingUp, Server, Target } from 'lucide-react';
import { ProjectDashboardTab } from './project-editor/components/ProjectDashboardTab';
import { ProjectMissionsTab } from './project-editor/components/ProjectMissionsTab';
import { ProjectSettingsTab } from './project-editor/components/ProjectSettingsTab';

type Tab = 'dashboard' | 'missions' | 'settings';
type SettingsTab = 'info' | 'docs' | 'prompts' | 'environments';

export const ProjectEditor: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { projects, updateProject } = useProjectStore();
    const { missions, deleteMission } = useMissionStore();
    const { geminiApiKey } = useSettingsStore();
    const { startExecution } = useTestExecutionStore();
    const { runs } = useTestRunStore();

    const [project, setProject] = useState<Project | null>(null);
    const [missionToDelete, setMissionToDelete] = useState<Mission | null>(null);
    
    // Switcher tab and sub-tab states
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [settingsTab, setSettingsTab] = useState<SettingsTab>('info');
    const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
    const [detailTab, setDetailTab] = useState<'score' | 'chat' | 'logs'>('score');
    
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
    const tabFromQuery = searchParams.get('tab');

    useEffect(() => {
        if (selectedRun) {
            setDetailTab('score');
        }
    }, [selectedRun]);

    useEffect(() => {
        const found = projects.find((p) => p.id === id);
        if (found) {
            setProject(normalizeProjectTargetConfig({
                ...found,
                documentation: found.documentation || '',
                description: found.description || '',
                system_prompts: found.system_prompts || [],
                environments: found.environments || [],
            }));
        } else {
            navigate('/projects');
        }
    }, [id, projects, navigate]);

    useEffect(() => {
        if (
            tabFromQuery === 'dashboard' ||
            tabFromQuery === 'missions' ||
            tabFromQuery === 'settings'
        ) {
            setActiveTab(tabFromQuery);
            return;
        }

        // Sub-tabs backward compatibility
        if (
            tabFromQuery === 'info' ||
            tabFromQuery === 'docs' ||
            tabFromQuery === 'prompts' ||
            tabFromQuery === 'environments'
        ) {
            setActiveTab('settings');
            setSettingsTab(tabFromQuery as SettingsTab);
            return;
        }

        setActiveTab('dashboard');
    }, [tabFromQuery]);

    if (!project) return null;

    const projectMissions = missions.filter((m) => m.project_id === project.id);

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);

        const nextSearchParams = new URLSearchParams(searchParams);
        if (tab === 'dashboard') {
            nextSearchParams.delete('tab');
        } else {
            nextSearchParams.set('tab', tab);
        }

        setSearchParams(nextSearchParams, { replace: true });
    };

    const handleSettingsTabChange = (subtab: SettingsTab) => {
        setSettingsTab(subtab);

        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.set('tab', subtab);
        setSearchParams(nextSearchParams, { replace: true });
    };

    const handleSave = () => {
        try {
            updateProject(project.id, project);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        } catch {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    const handleRunAllMissions = () => {
        if (!geminiApiKey) {
            alert('Configure your Gemini API Key in Settings first.');
            return;
        }
        projectMissions.forEach((mission) => {
            startExecution(mission, geminiApiKey);
        });
    };

    const mainTabs = [
        { key: 'dashboard' as const, label: 'Analytics Dashboard' },
        { key: 'missions' as const, label: 'Testing Missions' },
        { key: 'settings' as const, label: 'Workspace Settings' },
    ];

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
            {/* Nav & Title */}
            <div className="flex flex-col gap-4">
                <button
                    onClick={() => navigate('/projects')}
                    className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground hover:text-white transition-colors w-fit group select-none cursor-pointer"
                >
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Back to Projects list</span>
                </button>
                <div className="flex justify-between items-start select-none">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase">{project.name}</h1>
                        {project.description && (
                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-3xl">
                                {project.description}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Premium Tab Bar Selector */}
            <div className="flex flex-wrap gap-2.5 p-1.5 bg-[#1C2026] rounded-xl border border-border/50 w-fit select-none">
                {mainTabs.map((tab) => (
                    <button
                        key={tab.key}
                        id={`project-tab-${tab.key}`}
                        onClick={() => handleTabChange(tab.key)}
                        className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-lg cursor-pointer ${
                            activeTab === tab.key
                                ? 'bg-[#272D35] text-white border border-border/40 shadow-sm scale-[1.02]'
                                : 'text-muted-foreground hover:text-slate-200'
                        }`}
                    >
                        {tab.key === 'dashboard' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                        {tab.key === 'missions' && <Target className="w-4 h-4 text-[#4A72FF]" />}
                        {tab.key === 'settings' && <Server className="w-4 h-4 text-purple-400" />}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Active Tab Views */}
            {activeTab === 'dashboard' && (
                <ProjectDashboardTab
                    projectMissions={projectMissions}
                    runs={runs}
                    setSelectedRun={setSelectedRun}
                />
            )}

            {activeTab === 'missions' && (
                <ProjectMissionsTab
                    project={project}
                    projectMissions={projectMissions}
                    onDelete={setMissionToDelete}
                    onSelectRun={setSelectedRun}
                    onRunAll={handleRunAllMissions}
                />
            )}

            {activeTab === 'settings' && (
                <ProjectSettingsTab
                    project={project}
                    settingsTab={settingsTab}
                    onSettingsTabChange={handleSettingsTabChange}
                    saveStatus={saveStatus}
                    onSave={handleSave}
                    onChange={setProject}
                />
            )}

            {/* Modal: Mission Deletion Confirmation */}
            {missionToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-300 animate-modal-fade-in cursor-pointer"
                        onClick={() => setMissionToDelete(null)}
                    />
                    
                    <div className="relative bg-gradient-to-b from-[#111827] to-[#0b0f19] border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.8),_inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl max-w-sm w-full p-6 z-10 animate-modal-scale-in overflow-hidden text-center space-y-6">
                        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                        
                        <div className="relative flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-pulse">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold tracking-tight text-white">Delete Mission?</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                You are about to permanently delete the mission:
                            </p>
                            <div className="inline-block font-semibold text-white bg-slate-900/60 border border-white/5 px-3 py-1 rounded-lg text-sm max-w-full truncate shadow-inner">
                                "{missionToDelete.titulo}"
                            </div>
                        </div>

                        <div className="bg-red-500/[0.03] border-l-2 border-red-500/60 p-4 rounded-r-lg text-left space-y-1">
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">⚠️ Irreversible Action</span>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                The mission scenario, behavior parameters, and all associated test execution histories will be **permanently deleted**.
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setMissionToDelete(null)}
                                className="flex-1 px-4 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-semibold text-xs tracking-wide uppercase transition-all duration-200 cursor-pointer active:scale-[0.98] border-b-[2px] border-b-black/20 hover:border-white/[0.12]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    deleteMission(missionToDelete.id);
                                    setMissionToDelete(null);
                                }}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-bold text-xs tracking-wide uppercase shadow-[0_4px_12px_rgba(239,68,68,0.25)] hover:shadow-[0_4px_16px_rgba(239,68,68,0.35)] hover:-translate-y-[1px] transition-all duration-200 cursor-pointer active:scale-[0.98] active:translate-y-0"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Detailed Run Viewer */}
            <Modal isOpen={!!selectedRun} onClose={() => setSelectedRun(null)} title="Test Run Details" size="full">
                {selectedRun && (
                    <div className="flex flex-col gap-6 pb-4">
                        {/* Premium Tab Selection Bar */}
                        <div className="flex flex-wrap gap-2.5 p-1.5 bg-[#1C2026] rounded-xl border border-border/50 w-fit select-none">
                            <button
                                onClick={() => setDetailTab('score')}
                                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-lg cursor-pointer ${
                                    detailTab === 'score'
                                        ? 'bg-[#272D35] text-white border border-border/40 shadow-sm scale-[1.02]'
                                        : 'text-muted-foreground hover:text-slate-200'
                                }`}
                            >
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Evaluation Score</span>
                            </button>
                            <button
                                onClick={() => setDetailTab('chat')}
                                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-lg cursor-pointer ${
                                    detailTab === 'chat'
                                        ? 'bg-[#272D35] text-white border border-border/40 shadow-sm scale-[1.02]'
                                        : 'text-muted-foreground hover:text-slate-200'
                                }`}
                            >
                                <Target className="w-3.5 h-3.5 text-[#4A72FF]" />
                                <span>Chat Log</span>
                            </button>
                            <button
                                onClick={() => setDetailTab('logs')}
                                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-lg cursor-pointer ${
                                    detailTab === 'logs'
                                        ? 'bg-[#272D35] text-white border border-border/40 shadow-sm scale-[1.02]'
                                        : 'text-muted-foreground hover:text-slate-200'
                                }`}
                            >
                                <Server className="w-3.5 h-3.5 text-purple-400" />
                                <span>API Inspector</span>
                            </button>
                        </div>

                        {/* Tab Content Panel */}
                        <div className="space-y-6">
                            {/* TAB 1: SCORE & METRICS */}
                            {detailTab === 'score' && (
                                <div className="space-y-6 animate-fade-in">
                                    {/* Run Metadata Summary */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="bg-card border border-border/50 p-4 rounded-xl flex items-center justify-between shadow-sm select-none">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block">Execution Status</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${selectedRun.status === 'success' ? 'bg-emerald-500 shadow-[0_0_10px_#10B981]' : 'bg-rose-500 shadow-[0_0_10px_#F43F5E]'}`} />
                                                    <span className={`text-sm font-bold capitalize ${selectedRun.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {selectedRun.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-card border border-border/50 p-4 rounded-xl flex items-center justify-between shadow-sm select-none">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block">Turns Spent</span>
                                                <div className="text-sm font-bold text-slate-200">
                                                    {selectedRun.chat_history.filter(m => m.role === 'target').length} turns
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-card border border-border/50 p-4 rounded-xl flex items-center justify-between shadow-sm select-none">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block">Ran On</span>
                                                <div className="text-sm font-bold text-slate-200 font-mono">
                                                    {new Date(selectedRun.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Variables Card */}
                                    {selectedRun.resolved_variables && Object.keys(selectedRun.resolved_variables).length > 0 && (
                                        <div className="border border-border/50 p-4 rounded-xl bg-card/60 shadow-sm space-y-3">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground select-none">
                                                Resolved Scenario Variables
                                            </h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                {Object.entries(selectedRun.resolved_variables).map(([key, val]) => (
                                                    <div key={key} className="bg-[#13161B] border border-border/30 p-2.5 rounded-lg flex flex-col justify-between shadow-inner">
                                                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{key}</span>
                                                        <span className="text-xs font-mono font-bold text-white mt-1 break-all">{String(val)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Error panel */}
                                    {selectedRun.error && (
                                        <div className="space-y-2 border border-rose-500/20 p-5 rounded-xl bg-rose-500/[0.02] shadow-sm">
                                            <h3 className="font-bold text-xs uppercase text-rose-400 tracking-wider select-none">Execution Error</h3>
                                            <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 p-4 rounded-lg text-sm leading-relaxed font-mono">
                                                {selectedRun.error}
                                            </div>
                                        </div>
                                    )}

                                    {/* LLM Evaluation Report */}
                                    {selectedRun.evaluation && (
                                        <div className="border border-border/50 p-6 rounded-xl bg-card/40 shadow-sm space-y-4">
                                            <h3 className="font-bold text-xs uppercase text-muted-foreground tracking-wider border-b border-border/40 pb-2 select-none">Intelligent Evaluation Report</h3>
                                            <EvaluationReport
                                                evaluation={selectedRun.evaluation}
                                                mission={missions.find(m => m.id === selectedRun.mission_id)}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: CHAT TRANSCRIPT */}
                            {detailTab === 'chat' && (
                                <div className="border border-border/50 rounded-2xl bg-card overflow-hidden shadow-sm flex flex-col max-h-[65vh] animate-fade-in">
                                    <div className="bg-[#1C2026] px-5 py-3.5 border-b border-border/40 flex items-center justify-between select-none">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Conversation Transcript</h4>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground bg-[#272D35] px-2.5 py-0.5 rounded border border-border/40 font-semibold font-mono">
                                            {selectedRun.chat_history.length} Messages
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#13161B]/60 max-h-[55vh] custom-scrollbar">
                                        {selectedRun.chat_history.map(msg => (
                                            <ChatBubble key={msg.id} message={msg} />
                                        ))}
                                        {selectedRun.chat_history.length === 0 && (
                                            <div className="text-center py-12 text-muted-foreground text-xs font-semibold">
                                                No messages recorded in this execution.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: API INSPECTOR & DEBUG LOGS */}
                            {detailTab === 'logs' && (
                                <div className="animate-fade-in">
                                    <DebugLogPanel logs={selectedRun.debug_logs || []} />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
