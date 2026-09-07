import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
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
import { ArrowLeft, TrendingUp, Server, Target, Save, Check } from 'lucide-react';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { UnsavedChangesModal } from '../components/ui/UnsavedChangesModal';
import { useToastStore } from '../store/useToastStore';
import { ProjectMissionsTab } from './project-editor/components/ProjectMissionsTab';
import { ProjectSettingsTab } from './project-editor/components/ProjectSettingsTab';

const ProjectDashboardTab = React.lazy(() =>
    import('./project-editor/components/ProjectDashboardTab').then((module) => ({ default: module.ProjectDashboardTab }))
);

type Tab = 'dashboard' | 'missions' | 'settings';
type SettingsTab = 'info' | 'docs' | 'prompts' | 'environments';

import { getLocalStorage } from '../utils/fileStorage';

export const ProjectEditor: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { projects, updateProject, isHydrated } = useProjectStore();
    const { missions, deleteMission } = useMissionStore();
    const { geminiApiKey } = useSettingsStore();
    const { startExecution } = useTestExecutionStore();
    const { runs } = useTestRunStore();

    const [project, setProject] = useState<Project | null>(null);
    const [missionToDelete, setMissionToDelete] = useState<Mission | null>(null);
    const addToast = useToastStore((state) => state.addToast);
    
    // Switcher tab and sub-tab states
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [settingsTab, setSettingsTab] = useState<SettingsTab>('info');
    const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
    const [detailTab, setDetailTab] = useState<'score' | 'chat' | 'logs'>('score');
    
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
    const tabFromQuery = searchParams.get('tab');

    // Unsaved changes tracking
    const savedDataRef = useRef<string>('');
    const [isDirty, setIsDirty] = useState(false);
    const [unsavedModalOpen, setUnsavedModalOpen] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

    useEffect(() => {
        if (selectedRun) {
            setDetailTab('score');
        }
    }, [selectedRun]);

    useEffect(() => {
        if (!id) return;

        const found = projects.find((p) => p.id === id);
        if (found) {
            const normalized = normalizeProjectTargetConfig({
                ...found,
                documentation: found.documentation || '',
                description: found.description || '',
                system_prompts: found.system_prompts || [],
                environments: found.environments || [],
            });
            const serialized = JSON.stringify(normalized);
            if (!savedDataRef.current || !isDirty) {
                setProject(normalized);
                savedDataRef.current = serialized;
                setIsDirty(false);
            }
        } else if (isHydrated) {
            // Direct storage check as safety net before declaring not found
            const storage = getLocalStorage();
            if (storage) {
                try {
                    const raw = storage.getItem('agent-qa-projects');
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        const fallbackFound = parsed?.state?.projects?.find((p: Project) => p.id === id);
                        if (fallbackFound) {
                            const normalized = normalizeProjectTargetConfig({
                                ...fallbackFound,
                                documentation: fallbackFound.documentation || '',
                                description: fallbackFound.description || '',
                                system_prompts: fallbackFound.system_prompts || [],
                                environments: fallbackFound.environments || [],
                            });
                            setProject(normalized);
                            savedDataRef.current = JSON.stringify(normalized);
                            setIsDirty(false);
                            updateProject(fallbackFound.id, fallbackFound);
                            return;
                        }
                    }
                } catch (e) {
                    console.warn('[ProjectEditor] Storage fallback lookup error:', e);
                }
            }

            // Genuinely not found after full hydration and fallback check
            navigate('/projects');
        }
    }, [id, projects, navigate, isDirty, isHydrated, updateProject]);

    // Track dirty state when project state mutates
    useEffect(() => {
        if (savedDataRef.current && project) {
            const currentSerialized = JSON.stringify(normalizeProjectTargetConfig(project));
            setIsDirty(currentSerialized !== savedDataRef.current);
        }
    }, [project]);

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

    const projectMissions = project ? missions.filter((m) => m.project_id === project.id) : [];

    const requestNavigation = (action: () => void) => {
        if (isDirty) {
            setPendingNavigation(() => action);
            setUnsavedModalOpen(true);
        } else {
            action();
        }
    };

    const handleTabChange = (tab: Tab) => {
        const doChange = () => {
            setActiveTab(tab);

            const nextSearchParams = new URLSearchParams(searchParams);
            if (tab === 'dashboard') {
                nextSearchParams.delete('tab');
            } else {
                nextSearchParams.set('tab', tab);
            }

            setSearchParams(nextSearchParams, { replace: true });
        };

        requestNavigation(doChange);
    };

    const handleSettingsTabChange = (subtab: SettingsTab) => {
        setSettingsTab(subtab);

        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.set('tab', subtab);
        setSearchParams(nextSearchParams, { replace: true });
    };

    const handleSave = useCallback(() => {
        if (!project) return;
        if (!project.name || project.name.trim() === '') {
            addToast('Project Name is required', 'error');
            setActiveTab('settings');
            setSettingsTab('info');
            return;
        }

        // Validate System Prompts
        for (const prompt of project.system_prompts) {
            if (!prompt.name || prompt.name.trim() === '') {
                addToast('All system prompts must have a name', 'error');
                setActiveTab('settings');
                setSettingsTab('prompts');
                return;
            }
            if (!prompt.content || prompt.content.trim() === '') {
                addToast(`System prompt "${prompt.name}" content cannot be empty`, 'error');
                setActiveTab('settings');
                setSettingsTab('prompts');
                return;
            }
        }

        // Validate Environments
        for (const env of project.environments) {
            if (!env.name || env.name.trim() === '') {
                addToast('All environments must have a name', 'error');
                setActiveTab('settings');
                setSettingsTab('environments');
                return;
            }
            if (project.target_provider === 'http' && (!env.api_config?.post_url || env.api_config.post_url.trim() === '')) {
                addToast(`Environment "${env.name}" requires a POST URL for HTTP projects`, 'error');
                setActiveTab('settings');
                setSettingsTab('environments');
                return;
            }
        }

        try {
            updateProject(project.id, project);
            useMissionStore.getState().syncProjectSystemPrompts(project.id, project.system_prompts);
            savedDataRef.current = JSON.stringify(normalizeProjectTargetConfig(project));
            setIsDirty(false);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        } catch {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    }, [project, updateProject, addToast]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave]);

    // Keep references for unmount persistence
    const projectRef = useRef(project);
    projectRef.current = project;
    const isDirtyRef = useRef(isDirty);
    isDirtyRef.current = isDirty;

    // Auto-save debounced after 1.2s of inactivity when dirty
    useEffect(() => {
        if (!isDirty || !project || !project.name?.trim()) return;

        const timer = setTimeout(() => {
            try {
                updateProject(project.id, project);
                useMissionStore.getState().syncProjectSystemPrompts(project.id, project.system_prompts);
                savedDataRef.current = JSON.stringify(normalizeProjectTargetConfig(project));
                setIsDirty(false);
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2500);
            } catch (e) {
                console.warn('[ProjectEditor] Auto-save error:', e);
            }
        }, 1200);

        return () => clearTimeout(timer);
    }, [isDirty, project, updateProject]);

    // Persist immediately on reload, tab close, navigation, or visibility change if dirty
    useEffect(() => {
        const persistCurrentDirty = () => {
            if (isDirtyRef.current && projectRef.current && projectRef.current.name?.trim()) {
                try {
                    useProjectStore.getState().updateProject(projectRef.current.id, projectRef.current);
                    useMissionStore.getState().syncProjectSystemPrompts(projectRef.current.id, projectRef.current.system_prompts);
                } catch (e) {
                    console.warn('[ProjectEditor] Persist on unload error:', e);
                }
            }
        };

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            persistCurrentDirty();
            if (isDirtyRef.current) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                persistCurrentDirty();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', persistCurrentDirty);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', persistCurrentDirty);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            persistCurrentDirty();
        };
    }, []);

    const handleRunAllMissions = (missionsToRun: Mission[]) => {
        if (!geminiApiKey) {
            addToast('Configure your Gemini API Key in Settings first.', 'error');
            return;
        }
        if (missionsToRun.length === 0) {
            addToast('No missions available for this batch run.', 'error');
            return;
        }
        missionsToRun.forEach((mission) => {
            startExecution(mission, geminiApiKey);
        });
    };

    const mainTabs = [
        { key: 'dashboard' as const, label: 'Analytics Dashboard' },
        { key: 'missions' as const, label: 'Testing Missions' },
        { key: 'settings' as const, label: 'Workspace Settings' },
    ];

    if (!project) {
        return (
            <div className="p-12 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[400px] gap-3">
                <div className="w-8 h-8 border-2 border-[#4A72FF] border-t-transparent rounded-full animate-spin" />
                <p className="text-body text-muted-foreground animate-pulse">Loading project...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
            {/* Nav & Title */}
            <div className="flex flex-col gap-4">
                <button
                    onClick={() => requestNavigation(() => navigate('/projects'))}
                    className="flex items-center gap-2 text-xs font-extrabold text-muted-foreground hover:text-white transition-colors w-fit group select-none cursor-pointer"
                >
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Back to Projects list</span>
                </button>
                <div id="project-editor-header" className="flex justify-between items-start select-none">
                    <div>
                        <h1 className="text-display text-white">{project.name}</h1>
                        {project.description && (
                            <p className="text-body text-muted-foreground mt-1.5 max-w-[75ch]">
                                {project.description}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {saveStatus === 'saved' && (
                            <span className="text-xs text-emerald-400 flex items-center gap-1.5 animate-fade-in bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 font-semibold">
                                <Check className="w-3.5 h-3.5" /> Saved
                            </span>
                        )}
                        <button
                            id="save-project-btn"
                            onClick={handleSave}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                                isDirty
                                    ? 'bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] text-white shadow-md hover:scale-[1.02] active:scale-[0.98]'
                                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                            }`}
                            title={isDirty ? "Unsaved changes exist" : "All changes saved"}
                        >
                            {isDirty ? (
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            ) : (
                                <Save className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span>Save Changes</span>
                        </button>
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
                        className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all duration-300 rounded-lg cursor-pointer ${
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
                <Suspense fallback={<div className="h-64 rounded-xl bg-card animate-pulse" aria-label="Loading project dashboard" />}>
                    <ProjectDashboardTab
                        projectMissions={projectMissions}
                        runs={runs}
                        setSelectedRun={setSelectedRun}
                    />
                </Suspense>
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
                    isDirty={isDirty}
                />
            )}

            {/* Unsaved Changes Modal */}
            <UnsavedChangesModal
                isOpen={unsavedModalOpen}
                onSave={() => {
                    handleSave();
                    setUnsavedModalOpen(false);
                    if (pendingNavigation) {
                        pendingNavigation();
                        setPendingNavigation(null);
                    }
                }}
                onDiscard={() => {
                    setUnsavedModalOpen(false);
                    const found = projects.find((p) => p.id === id);
                    if (found) {
                        const normalized = normalizeProjectTargetConfig({
                            ...found,
                            documentation: found.documentation || '',
                            description: found.description || '',
                            system_prompts: found.system_prompts || [],
                            environments: found.environments || [],
                        });
                        setProject(normalized);
                        savedDataRef.current = JSON.stringify(normalized);
                        setIsDirty(false);
                    }
                    if (pendingNavigation) {
                        pendingNavigation();
                        setPendingNavigation(null);
                    }
                }}
                onCancel={() => {
                    setUnsavedModalOpen(false);
                    setPendingNavigation(null);
                }}
            />

            {/* Delete Confirmation Modal */}
            {missionToDelete && (
                <ConfirmDeleteModal
                    itemType="Mission"
                    itemName={missionToDelete.titulo}
                    warningDescription="The mission scenario, behavior parameters, and all associated test execution histories will be permanently deleted."
                    onConfirm={() => {
                        deleteMission(missionToDelete.id);
                        setMissionToDelete(null);
                    }}
                    onCancel={() => setMissionToDelete(null)}
                />
            )}

            {/* Modal: Detailed Run Viewer */}
            <Modal isOpen={!!selectedRun} onClose={() => setSelectedRun(null)} title="Test Run Details" size="full">
                {selectedRun && (
                    <div className="flex flex-col gap-6 pb-4">
                        {/* Premium Tab Selection Bar */}
                        <div className="flex flex-wrap gap-2.5 p-1.5 bg-[#1C2026] rounded-xl border border-border/50 w-fit select-none">
                            <button
                                onClick={() => setDetailTab('score')}
                                className={`flex items-center gap-2 px-4 py-2 text-label transition-all duration-300 rounded-lg cursor-pointer ${
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
                                className={`flex items-center gap-2 px-4 py-2 text-label transition-all duration-300 rounded-lg cursor-pointer ${
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
                                className={`flex items-center gap-2 px-4 py-2 text-label transition-all duration-300 rounded-lg cursor-pointer ${
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
                                                <span className="text-label text-muted-foreground block mb-1">Execution Status</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${selectedRun.status === 'success' ? 'bg-emerald-500 shadow-[0_0_10px_#10B981]' : 'bg-rose-500 shadow-[0_0_10px_#F43F5E]'}`} />
                                                    <span className={`text-body font-bold capitalize ${selectedRun.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {selectedRun.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-card border border-border/50 p-4 rounded-xl flex items-center justify-between shadow-sm select-none">
                                            <div className="space-y-1">
                                                <span className="text-label text-muted-foreground block mb-1">Turns Spent</span>
                                                <div className="text-body font-bold text-slate-200 tabular-nums">
                                                    {selectedRun.chat_history.filter(m => m.role === 'target').length} turns
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-card border border-border/50 p-4 rounded-xl flex items-center justify-between shadow-sm select-none">
                                            <div className="space-y-1">
                                                <span className="text-label text-muted-foreground block mb-1">Ran On</span>
                                                <div className="text-body font-bold text-slate-200 font-mono tabular-nums">
                                                    {new Date(selectedRun.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Variables Card */}
                                    {selectedRun.resolved_variables && Object.keys(selectedRun.resolved_variables).length > 0 && (
                                        <div className="border border-border/50 p-4 rounded-xl bg-card/60 shadow-sm space-y-3">
                                            <h4 className="text-label text-muted-foreground select-none block mb-2">
                                                Resolved Scenario Variables
                                            </h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                {Object.entries(selectedRun.resolved_variables).map(([key, val]) => (
                                                    <div key={key} className="bg-[#13161B] border border-border/30 p-2.5 rounded-lg flex flex-col justify-between shadow-inner">
                                                        <span className="text-label text-muted-foreground block mb-1">{key}</span>
                                                        <span className="text-body font-mono font-bold text-white break-all tabular-nums">{String(val)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Error panel */}
                                    {selectedRun.error && (
                                        <div className="space-y-2 border border-rose-500/20 p-5 rounded-xl bg-rose-500/[0.02] shadow-sm">
                                            <h3 className="text-label text-rose-400 select-none block mb-1">Execution Error</h3>
                                            <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 p-4 rounded-lg text-body font-mono">
                                                {selectedRun.error}
                                            </div>
                                        </div>
                                    )}

                                    {/* LLM Evaluation Report */}
                                    {selectedRun.evaluation && (
                                        <div className="border border-border/50 p-6 rounded-xl bg-card/40 shadow-sm space-y-4">
                                            <h3 className="text-label text-muted-foreground border-b border-border/40 pb-2 select-none mb-3 block">Intelligent Evaluation Report</h3>
                                            <EvaluationReport
                                                evaluation={selectedRun.evaluation}
                                                mission={missions.find(m => m.id === selectedRun.mission_id)}
                                                runId={selectedRun.id}
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
                                            <h4 className="text-label text-white block">Conversation Transcript</h4>
                                        </div>
                                        <span className="text-label text-muted-foreground bg-[#272D35] px-2.5 py-0.5 rounded border border-border/40 font-mono tabular-nums">
                                            {selectedRun.chat_history.length} Messages
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#13161B]/60 max-h-[55vh] custom-scrollbar">
                                        {selectedRun.chat_history.map(msg => (
                                            <ChatBubble key={msg.id} message={msg} />
                                        ))}
                                        {selectedRun.chat_history.length === 0 && (
                                            <div className="text-center py-12 text-muted-foreground text-body font-bold">
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
