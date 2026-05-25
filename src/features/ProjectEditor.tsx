import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Line, Doughnut } from 'react-chartjs-2';
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    PointElement, 
    LineElement, 
    ArcElement,
    Title as ChartTitle, 
    Tooltip, 
    Legend, 
    Filler 
} from 'chart.js';

// Register the chart.js plugins
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    ChartTitle,
    Tooltip,
    Legend,
    Filler
);
import { useProjectStore } from '../store/useProjectStore';
import { useMissionStore } from '../store/useMissionStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTestExecutionStore } from '../store/useTestExecutionStore';
import { useTestRunStore } from '../store/useTestRunStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EvaluationReport } from './EvaluationReport';
import { ChatBubble } from '../components/ChatBubble';
import { DebugLogPanel } from '../components/DebugLogPanel';
import { MissionCard } from '../components/MissionCard';
import { Project, SystemPrompt, Environment, ApiConfig, TargetProvider, Mission, TestRun } from '../types';
import {
    DEFAULT_GEMINI_TARGET_MODEL,
    getProjectGeminiModel,
    getProjectTargetProvider,
    normalizeProjectTargetConfig,
    SUGGESTED_GEMINI_TARGET_MODELS,
} from '../utils/missionTarget';
import {
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    FileText,
    Server,
    Target,
    ChevronDown,
    ChevronUp,
    Check,
    AlertCircle,
    Play,
    TrendingUp,
    CheckCircle2,
    Clock,
    Eye,
    HelpCircle,
} from 'lucide-react';

type Tab = 'dashboard' | 'missions' | 'settings';
type SettingsTab = 'info' | 'docs' | 'prompts' | 'environments';

const defaultApiConfig: ApiConfig = {
    post_url: '',
    get_url: '',
    auth_header: '',
    payload_template: '{\n  "message": "{{message}}"\n}',
    response_path: '',
    polling_interval: 2000,
    max_timeout: 30,
};

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
    
    // Analytical and restructured tab states
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [settingsTab, setSettingsTab] = useState<SettingsTab>('info');
    const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
    const [detailTab, setDetailTab] = useState<'score' | 'chat' | 'logs'>('score');
    
    const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
    const [expandedEnv, setExpandedEnv] = useState<string | null>(null);
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

        // Support backward compatibility for sub-tabs mapping directly into Settings tab
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
    const targetProvider = getProjectTargetProvider(project);
    const targetGeminiModel = getProjectGeminiModel(project);

    // Filter project runs
    const projectMissionIds = projectMissions.map((m) => m.id);
    const projectRuns = runs.filter((r) => projectMissionIds.includes(r.mission_id));
    const completedRuns = projectRuns.filter((r) => r.status !== 'running');
    const sortedCompletedRuns = [...completedRuns].sort((a, b) => b.created_at - a.created_at);

    // Compute key metrics
    const totalExecutions = completedRuns.length;
    const successExecutions = completedRuns.filter((r) => r.status === 'success').length;
    const successRate = totalExecutions > 0 ? Math.round((successExecutions / totalExecutions) * 100) : 0;
    
    const evaluatedRuns = completedRuns.filter((r) => r.evaluation && typeof r.evaluation.overall_score === 'number');
    const averageScore = evaluatedRuns.length > 0
        ? Math.round(evaluatedRuns.reduce((acc, r) => acc + (r.evaluation?.overall_score || 0), 0) / evaluatedRuns.length)
        : 0;

    // Last 15 evaluated runs chronologically for performance trend
    const trendRuns = [...evaluatedRuns]
        .sort((a, b) => a.created_at - b.created_at)
        .slice(-15);
    // Dynamic Y-axis Scaling
    const scores = trendRuns.map((r) => r.evaluation?.overall_score || 0);
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 100;
    
    // Add comfortable padding of 15% to range so the line doesn't clip or look too flat
    const rawSpan = maxScore - minScore;
    const pad = Math.max(10, Math.round(rawSpan * 0.15));
    const yMin = Math.max(0, minScore - pad);
    const yMax = Math.min(100, maxScore + pad);
    const yRange = yMax - yMin || 20;

    const handleRunAllMissions = () => {
        if (!geminiApiKey) {
            alert('Configure your Gemini API Key in Settings first.');
            return;
        }
        projectMissions.forEach((mission) => {
            startExecution(mission, geminiApiKey);
        });
    };

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

    // --- System Prompts CRUD ---
    const handleAddPrompt = () => {
        const newPrompt: SystemPrompt = {
            id: crypto.randomUUID(),
            name: 'New Prompt',
            content: '',
        };
        setProject({ ...project, system_prompts: [...project.system_prompts, newPrompt] });
        setExpandedPrompt(newPrompt.id);
    };

    const handleUpdatePrompt = (promptId: string, field: keyof SystemPrompt, value: string) => {
        setProject({
            ...project,
            system_prompts: project.system_prompts.map((sp) =>
                sp.id === promptId ? { ...sp, [field]: value } : sp
            ),
        });
    };

    const handleDeletePrompt = (promptId: string) => {
        setProject({
            ...project,
            system_prompts: project.system_prompts.filter((sp) => sp.id !== promptId),
        });
    };

    // --- Environments CRUD ---
    const handleAddEnvironment = () => {
        const newEnv: Environment = {
            id: crypto.randomUUID(),
            name: 'New Environment',
            api_config: { ...defaultApiConfig },
        };
        setProject({ ...project, environments: [...project.environments, newEnv] });
        setExpandedEnv(newEnv.id);
    };

    const handleUpdateEnv = (
        envId: string,
        field: 'name',
        value: Environment['name']
    ) => {
        setProject({
            ...project,
            environments: project.environments.map((e) =>
                e.id === envId ? { ...e, [field]: value } : e
            ),
        });
    };

    const handleUpdateEnvApiConfig = (
        envId: string,
        field: keyof ApiConfig,
        value: ApiConfig[keyof ApiConfig]
    ) => {
        setProject({
            ...project,
            environments: project.environments.map((e) =>
                e.id === envId
                    ? { ...e, api_config: { ...e.api_config, [field]: value } }
                    : e
            ),
        });
    };

    const handleDeleteEnv = (envId: string) => {
        setProject({
            ...project,
            environments: project.environments.filter((e) => e.id !== envId),
        });
    };

    const handleTargetProviderChange = (value: TargetProvider) => {
        setProject((prev) =>
            prev
                ? {
                      ...prev,
                      target_provider: value,
                      target_gemini_model:
                          value === 'gemini'
                              ? getProjectGeminiModel(prev)
                              : prev.target_gemini_model,
                  }
                : prev
        );
    };



    // Render Line Chart using react-chartjs-2 for Score Trends
    const renderTrendChart = () => {
        if (trendRuns.length === 0) {
            return (
                <div className="h-[150px] flex flex-col items-center justify-center text-xs text-muted-foreground bg-[#1C2026]/40 border border-dashed border-border/60 rounded-xl select-none animate-fade-in">
                    <TrendingUp className="w-6 h-6 text-slate-500 mb-2 opacity-50" />
                    <span>Run tests to populate the performance trend chart.</span>
                </div>
            );
        }

        const chartData = {
            labels: trendRuns.map((r) => {
                const m = missions.find(mission => mission.id === r.mission_id);
                return m?.titulo || 'Mission';
            }),
            datasets: [
                {
                    label: 'Score',
                    data: trendRuns.map((r) => r.evaluation?.overall_score || 0),
                    borderColor: '#4A72FF',
                    borderWidth: 2,
                    pointBackgroundColor: '#13161B',
                    pointBorderColor: '#4A72FF',
                    pointBorderWidth: 2,
                    pointRadius: 4.5,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#13161B',
                    pointHoverBorderColor: '#8B5CF6',
                    pointHoverBorderWidth: 2.5,
                    fill: true,
                    backgroundColor: 'rgba(74, 114, 255, 0.08)',
                    tension: 0.3,
                }
            ]
        };

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    backgroundColor: 'rgba(28, 32, 38, 0.95)',
                    titleColor: '#ffffff',
                    titleFont: {
                        weight: 'bold',
                        size: 11,
                    },
                    bodyColor: '#e2e8f0',
                    bodyFont: {
                        size: 11,
                    },
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 12,
                    displayColors: false,
                    callbacks: {
                        title: (context: any) => {
                            const idx = context[0].dataIndex;
                            const run = trendRuns[idx];
                            const m = missions.find(mission => mission.id === run.mission_id);
                            return m?.titulo || 'Mission';
                        },
                        label: (context: any) => {
                            const idx = context.dataIndex;
                            const run = trendRuns[idx];
                            const dateStr = new Date(run.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                            return [
                                `Score: ${context.parsed.y}`,
                                `Date: ${dateStr}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                    },
                    ticks: {
                        display: false,
                    }
                },
                y: {
                    min: yMin,
                    max: yMax,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                    },
                    ticks: {
                        color: 'rgba(156, 163, 175, 0.8)',
                        font: {
                            weight: 'bold',
                            size: 8,
                        },
                        stepSize: Math.round(yRange / 2) || 20,
                    }
                }
            },
            onClick: (_: any, elements: any) => {
                if (elements && elements.length > 0) {
                    const idx = elements[0].index;
                    const run = trendRuns[idx];
                    setSelectedRun(run);
                }
            }
        };

        return (
            <div className="relative w-full bg-[#1C2026] border border-border/50 p-5 rounded-2xl flex flex-col justify-between shadow-sm animate-fade-in">
                <div className="flex items-center justify-between mb-3 select-none">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#4A72FF]" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Score Trend (Last 15 Runs)</h4>
                    </div>
                    <span className="text-[9px] text-muted-foreground font-semibold">Scale: {yMin} - {yMax}</span>
                </div>
                
                <div className="relative w-full h-[140px]">
                    <Line data={chartData} options={chartOptions as any} />
                </div>
            </div>
        );
    };

    const mainTabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: 'dashboard', label: 'Dashboard', icon: <TrendingUp className="w-4 h-4" /> },
        { key: 'missions', label: 'Missions', icon: <Target className="w-4 h-4" /> },
        { key: 'settings', label: 'Settings', icon: <Server className="w-4 h-4" /> },
    ];

    return (
        <div className="p-6 md:p-8 w-full max-w-[1600px] mx-auto pb-24">
            {/* Header */}
            <div id="project-editor-header" className="flex items-center gap-4 mb-6 select-none">
                <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <h1 className="text-3xl font-bold tracking-tight truncate flex-1">
                    {project.name || 'Untitled Project'}
                </h1>
            </div>

            {/* Main Premium Gradient Tab Bar */}
            <div className="flex flex-wrap gap-2.5 mb-8 p-1.5 bg-[#1C2026] rounded-xl border border-border/50 select-none">
                {mainTabs.map((tab) => (
                    <button
                        key={tab.key}
                        id={`project-tab-${tab.key}`}
                        onClick={() => handleTabChange(tab.key)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 text-xs uppercase tracking-wider font-bold transition-all duration-300 rounded-lg cursor-pointer ${
                            activeTab === tab.key
                                ? 'bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] text-white shadow-[0_4px_15px_rgba(74,114,255,0.3)] border border-white/[0.1] scale-[1.02]'
                                : 'border border-transparent text-muted-foreground hover:text-foreground hover:bg-[#272D35]/60 hover:scale-[1.01]'
                        }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tab.key === 'missions' && (
                            <span className={`ml-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                activeTab === tab.key
                                    ? 'bg-white/20 text-white'
                                    : 'bg-[#272D35] text-muted-foreground border border-border/40'
                            }`}>
                                {projectMissions.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab: Dashboard */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                        {/* Success Rate Donut */}
                        <div className="border border-border/50 bg-[#1C2026] p-5 rounded-2xl flex items-center justify-between shadow-sm select-none">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Success Rate</span>
                                <h3 className="text-2xl font-black text-white">{successRate}%</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {successExecutions} of {totalExecutions} total executions successful.
                                </p>
                            </div>
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <Doughnut 
                                    data={{
                                        labels: ['Success', 'Failure'],
                                        datasets: [{
                                            data: totalExecutions > 0 ? [successExecutions, totalExecutions - successExecutions] : [0, 1],
                                            backgroundColor: totalExecutions > 0 
                                                ? ['#10B981', '#F43F5E'] 
                                                : ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.06)'],
                                            borderWidth: 0,
                                            hoverOffset: totalExecutions > 0 ? 2 : 0
                                        }]
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        cutout: '78%',
                                        plugins: {
                                            legend: { display: false },
                                            tooltip: { enabled: totalExecutions > 0 }
                                        }
                                    }}
                                />
                                <div className="absolute flex flex-col items-center pointer-events-none select-none">
                                    <span className="text-base font-black text-white">{successRate}%</span>
                                    <span className="text-[8px] uppercase font-bold text-slate-400">Pass</span>
                                </div>
                            </div>
                        </div>

                        {/* Average Score */}
                        <div className="border border-border/50 bg-[#1C2026] p-5 rounded-2xl flex flex-col justify-between shadow-sm select-none">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Evaluation Score</span>
                                <div className="flex items-baseline gap-2">
                                    <h3 className={`text-3xl font-black ${
                                        averageScore >= 80 ? 'text-emerald-400' : averageScore >= 50 ? 'text-amber-400' : 'text-red-400'
                                    }`}>{averageScore}</h3>
                                    <span className="text-xs text-muted-foreground">/ 100</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                                    Calculated from {evaluatedRuns.length} evaluated test runs.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 mt-4 text-[10px] uppercase font-bold text-slate-400 bg-[#272D35]/50 px-3 py-1.5 rounded-lg border border-border/20 w-fit">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Quality Bar</span>
                            </div>
                        </div>

                        {/* Total Executions */}
                        <div className="border border-border/50 bg-[#1C2026] p-5 rounded-2xl flex flex-col justify-between shadow-sm select-none">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Executions Overview</span>
                                <h3 className="text-3xl font-black text-white">{totalExecutions}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                                    Simulations ran across all registered missions.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 mt-4 text-[10px] uppercase font-bold text-slate-400 bg-[#272D35]/50 px-3 py-1.5 rounded-lg border border-border/20 w-fit">
                                <Clock className="w-3.5 h-3.5 text-sky-400" />
                                <span>History Log</span>
                            </div>
                        </div>
                    </div>

                    {/* Chart Panel */}
                    {renderTrendChart()}

                    {/* Last 10 Tests Table */}
                    <div className="border border-border/50 bg-[#1C2026] rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-border/40 flex items-center justify-between">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Last 10 Completed Test Runs</h4>
                            <span className="text-[10px] text-muted-foreground font-semibold bg-[#272D35] px-2 py-0.5 rounded border border-border/40">
                                {sortedCompletedRuns.length} completed total
                            </span>
                        </div>

                        {sortedCompletedRuns.length === 0 ? (
                            <div className="p-12 text-center text-xs text-muted-foreground">
                                No completed runs yet for this project.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="text-[10px] text-slate-400 uppercase bg-[#272D35]/30 border-b border-border/40">
                                        <tr>
                                            <th className="px-6 py-3.5 font-bold">Date & Time</th>
                                            <th className="px-6 py-3.5 font-bold">Mission</th>
                                            <th className="px-6 py-3.5 font-bold">Status</th>
                                            <th className="px-6 py-3.5 font-bold">Turns</th>
                                            <th className="px-6 py-3.5 font-bold">Score</th>
                                            <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {sortedCompletedRuns.slice(0, 10).map((run) => {
                                            const mission = projectMissions.find(m => m.id === run.mission_id);
                                            return (
                                                <tr key={run.id} className="hover:bg-muted/10 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                                                        {new Date(run.created_at).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 font-semibold text-white">
                                                        {mission?.titulo || 'Unknown Mission'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Badge variant={run.status === 'success' ? 'success' : run.status === 'failed' ? 'destructive' : 'secondary'}>
                                                            {run.status.toUpperCase()}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-300">
                                                        {Math.floor(run.chat_history.length / 2)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {run.evaluation ? (
                                                            <span className={`font-black ${
                                                                run.evaluation.overall_score >= 80 ? 'text-emerald-400' : run.evaluation.overall_score >= 50 ? 'text-amber-400' : 'text-red-400'
                                                            }`}>
                                                                {run.evaluation.overall_score}/100
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button variant="outline" size="sm" onClick={() => setSelectedRun(run)} className="h-7 text-[10px]">
                                                            <Eye className="w-3.5 h-3.5 mr-1" /> View Details
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab: Missions */}
            {activeTab === 'missions' && (
                <div className="space-y-6">
                    {/* Mission Header Summary */}
                    {projectMissions.length > 0 && (
                        <div className="flex justify-between items-center select-none">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <Target className="w-4 h-4 text-primary" />
                                Registered Scenarios ({projectMissions.length})
                            </h3>
                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={() => navigate('/missions/new?project=' + project.id)}
                                    className="gap-2 bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] hover:scale-[1.02] active:scale-[0.98] text-white font-bold text-xs uppercase shadow-lg cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" /> New Mission
                                </Button>
                                <Button
                                    onClick={handleRunAllMissions}
                                    className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg cursor-pointer text-xs font-bold uppercase"
                                >
                                    <Play className="w-3.5 h-3.5 fill-current" /> Run All Scenarios
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Scenario Cards */}
                    <div id="project-missions-list" className="grid grid-cols-1 gap-4">
                        {projectMissions.map((mission) => (
                            <MissionCard
                                key={mission.id}
                                mission={mission}
                                onDelete={setMissionToDelete}
                                onSelectRun={setSelectedRun}
                            />
                        ))}

                        {projectMissions.length === 0 && (
                            <div className="py-12 text-center border-2 border-dashed border-border/50 bg-[#1C2026]/40 rounded-2xl select-none">
                                <p className="text-muted-foreground mb-4 text-xs font-semibold">
                                    No missions created for this project yet.
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <Button
                                        onClick={() => navigate('/missions/new?project=' + project.id)}
                                        className="gap-2 bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] text-white font-bold text-xs uppercase shadow-md cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform"
                                    >
                                        <Plus className="w-4 h-4" /> Create New Mission
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab: Settings */}
            {activeTab === 'settings' && (
                <div className="space-y-6">
                    {/* Header bar wrapping sub-tabs and premium Save button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
                        {/* Configuration sub-tabs bar */}
                        <div className="flex flex-wrap gap-2.5 p-1 bg-[#1C2026] rounded-xl border border-border/50 w-fit">
                            <button
                                id="project-tab-info"
                                onClick={() => handleSettingsTabChange('info')}
                                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-lg cursor-pointer ${
                                    settingsTab === 'info'
                                        ? 'bg-[#272D35] text-white border border-border/40 shadow-sm'
                                        : 'text-muted-foreground hover:text-slate-200'
                                }`}
                            >
                                Basic Info
                            </button>
                            <button
                                id="project-tab-docs"
                                onClick={() => handleSettingsTabChange('docs')}
                                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-lg cursor-pointer ${
                                    settingsTab === 'docs'
                                        ? 'bg-[#272D35] text-white border border-border/40 shadow-sm'
                                        : 'text-muted-foreground hover:text-slate-200'
                                }`}
                            >
                                Documentation
                            </button>
                            <button
                                id="project-tab-prompts"
                                onClick={() => handleSettingsTabChange('prompts')}
                                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-lg cursor-pointer ${
                                    settingsTab === 'prompts'
                                        ? 'bg-[#272D35] text-white border border-border/40 shadow-sm'
                                        : 'text-muted-foreground hover:text-slate-200'
                                }`}
                            >
                                System Prompts ({project.system_prompts.length})
                            </button>
                            {targetProvider !== 'gemini' && (
                                <button
                                    id="project-tab-environments"
                                    onClick={() => handleSettingsTabChange('environments')}
                                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-lg cursor-pointer ${
                                        settingsTab === 'environments'
                                            ? 'bg-[#272D35] text-white border border-border/40 shadow-sm'
                                            : 'text-muted-foreground hover:text-slate-200'
                                    }`}
                                >
                                    Environments ({project.environments.length})
                                </button>
                            )}
                        </div>

                        {/* Premium Save Settings Button */}
                        <Button
                            onClick={handleSave}
                            className={`gap-2 transition-all duration-300 shadow-[0_4px_15px_rgba(74,114,255,0.25)] hover:scale-[1.02] active:scale-[0.98] font-bold text-xs uppercase tracking-wide px-5 py-2.5 rounded-lg cursor-pointer flex items-center justify-center ${
                                saveStatus === 'saved'
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:from-emerald-500 hover:to-teal-400 border border-white/[0.05]'
                                    : saveStatus === 'error'
                                    ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-[0_4px_12px_rgba(239,68,68,0.25)] hover:from-red-500 hover:to-rose-400'
                                    : 'bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] text-white border border-white/[0.05]'
                            }`}
                        >
                            {saveStatus === 'saved' ? (
                                <><Check className="w-3.5 h-3.5" /> Saved!</>
                            ) : saveStatus === 'error' ? (
                                <><AlertCircle className="w-3.5 h-3.5" /> Error</>
                            ) : (
                                <><Save className="w-3.5 h-3.5" /> Save Settings</>
                            )}
                        </Button>
                    </div>

                    {/* Sub-tab: Basic Info */}
                    {settingsTab === 'info' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                            {/* Project Info Card */}
                            <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card flex flex-col justify-between shadow-sm">
                                <div className="space-y-4">
                                    <h2 className="text-base font-bold text-white uppercase tracking-wider border-b border-border/40 pb-2">Project Info</h2>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                            <span>Name</span>
                                            <span title="The name of your project, grouping together a set of system prompts, environments, and testing missions.">
                                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                            </span>
                                        </label>
                                        <Input
                                            value={project.name}
                                            onChange={(e) => setProject({ ...project, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                            <span>Description</span>
                                            <span title="A brief description of what this project tests (e.g. 'Customer Support AI evaluation').">
                                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                            </span>
                                        </label>
                                        <textarea
                                            className="w-full h-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            value={project.description}
                                            onChange={(e) =>
                                                setProject({ ...project, description: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Target Integration Card */}
                            <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card flex flex-col justify-between shadow-sm">
                                <div className="space-y-4">
                                    <h2 className="text-base font-bold text-white uppercase tracking-wider border-b border-border/40 pb-2">
                                        Target Integration
                                    </h2>

                                    <div>
                                        <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                            <span>Project Target Provider</span>
                                            <span title="Select whether your AI agent is accessed via an HTTP API Endpoint or directly instantiated using a standard Gemini LLM.">
                                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                            </span>
                                        </label>
                                        <select
                                            className="w-full h-10 rounded-md border border-input bg-[#1C2026] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            value={targetProvider}
                                            onChange={(e) =>
                                                handleTargetProviderChange(e.target.value as TargetProvider)
                                            }
                                        >
                                            <option value="http">HTTP API</option>
                                            <option value="gemini">Gemini</option>
                                        </select>
                                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                            This setting applies to all missions in the project. Missions only
                                            choose which prompt to test and, for HTTP projects, which
                                            environment to use.
                                        </p>
                                    </div>

                                    {targetProvider === 'gemini' ? (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                                                    <span>Gemini Model</span>
                                                    <span title="Specify which Gemini LLM model should be used as the target agent (e.g., gemini-1.5-pro or gemini-1.5-flash).">
                                                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                                    </span>
                                                </label>
                                                <Input
                                                    list="project-gemini-model-suggestions"
                                                    value={targetGeminiModel}
                                                    onChange={(e) =>
                                                        setProject({
                                                            ...project,
                                                            target_gemini_model: e.target.value,
                                                        })
                                                    }
                                                    placeholder={DEFAULT_GEMINI_TARGET_MODEL}
                                                    className="font-mono"
                                                />
                                                <datalist id="project-gemini-model-suggestions">
                                                    {SUGGESTED_GEMINI_TARGET_MODELS.map((model) => (
                                                        <option key={model} value={model} />
                                                    ))}
                                                </datalist>
                                            </div>
                                            <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-2">
                                                <p className="text-xs font-bold text-white uppercase tracking-wider">Gemini project mode</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    AgentEval will reuse the Gemini API key configured in
                                                    Settings for the target call.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-2">
                                            <p className="text-xs font-bold text-white uppercase tracking-wider">HTTP project mode</p>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Missions in this project will run against one of the
                                                environments configured in the Environments tab.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Sub-tab: Documentation */}
                    {settingsTab === 'docs' && (
                        <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card shadow-sm">
                            <div className="flex justify-between items-center border-b border-border/40 pb-2 mb-2 select-none">
                                <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                    <span>Project Documentation (Markdown)</span>
                                    <span title="Enter or paste your domain/product's Markdown documentation. The evaluator will automatically read this context to verify domain-specific rules and instructions.">
                                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                    </span>
                                </h2>
                                <span className="text-[10px] text-muted-foreground bg-[#272D35] px-2.5 py-1 rounded border border-border/50 font-mono font-bold">
                                    {project.documentation?.length || 0} CHARS
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Paste the full documentation of the target system here. The AI will use
                                it to generate intelligent test missions.
                            </p>
                            <textarea
                                className="w-full h-[62vh] font-mono rounded-lg border border-[#2D3036] bg-[#13161B] px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A72FF] leading-relaxed"
                                value={project.documentation}
                                onChange={(e) =>
                                    setProject({ ...project, documentation: e.target.value })
                                }
                                placeholder="# System Documentation&#10;&#10;Paste the complete documentation of the target system here..."
                            />
                        </section>
                    )}

                    {/* Sub-tab: System Prompts */}
                    {settingsTab === 'prompts' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center select-none">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Add the system prompts used by the target's AI agents.
                                </p>
                                <Button variant="outline" size="sm" onClick={handleAddPrompt} className="gap-2 text-xs font-bold uppercase">
                                    <Plus className="w-4 h-4" /> Add Prompt
                                </Button>
                            </div>

                            {project.system_prompts.map((sp) => (
                                <div
                                    key={sp.id}
                                    className="border border-border/50 rounded-xl bg-card overflow-hidden shadow-sm"
                                >
                                    <div
                                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors select-none"
                                        onClick={() =>
                                            setExpandedPrompt(expandedPrompt === sp.id ? null : sp.id)
                                        }
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-bold text-sm text-white">{sp.name || 'Untitled'}</span>
                                            <span className="text-[10px] text-muted-foreground font-semibold bg-[#272D35] px-2 py-0.5 rounded border border-border/40 font-mono">
                                                {sp.content.length} chars
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeletePrompt(sp.id);
                                                }}
                                                className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                            {expandedPrompt === sp.id ? (
                                                <ChevronUp className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </div>
                                    {expandedPrompt === sp.id && (
                                        <div className="p-4 border-t border-border/40 space-y-4">
                                            <Input
                                                placeholder="Prompt Name (e.g., Generic Agent, Payments Agent)"
                                                value={sp.name}
                                                onChange={(e) =>
                                                    handleUpdatePrompt(sp.id, 'name', e.target.value)
                                                }
                                            />
                                            <textarea
                                                className="w-full h-64 font-mono rounded-md border border-input bg-[#13161B] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring leading-relaxed"
                                                placeholder="Paste the system prompt content here..."
                                                value={sp.content}
                                                onChange={(e) =>
                                                    handleUpdatePrompt(sp.id, 'content', e.target.value)
                                                }
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {project.system_prompts.length === 0 && (
                                <div className="py-12 text-center border-2 border-dashed border-border/50 rounded-xl select-none">
                                    <p className="text-muted-foreground mb-4 text-xs font-semibold">
                                        No system prompts added yet.
                                    </p>
                                    <Button onClick={handleAddPrompt} variant="outline" className="gap-2 font-bold text-xs uppercase">
                                        <Plus className="w-4 h-4" /> Add first prompt
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sub-tab: Environments */}
                    {settingsTab === 'environments' && targetProvider !== 'gemini' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center select-none">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Configure API endpoints for each environment (dev, staging, prod).
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddEnvironment}
                                    className="gap-2 text-xs font-bold uppercase"
                                >
                                    <Plus className="w-4 h-4" /> Add Environment
                                </Button>
                            </div>

                            {project.environments.map((env) => (
                                <div
                                    key={env.id}
                                    className="border border-border/50 rounded-xl bg-card overflow-hidden shadow-sm"
                                >
                                    <div
                                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors select-none"
                                        onClick={() =>
                                            setExpandedEnv(expandedEnv === env.id ? null : env.id)
                                        }
                                    >
                                        <div className="flex items-center gap-3">
                                            <Server className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-bold text-sm text-white">
                                                {env.name || 'Untitled'}
                                            </span>
                                            {env.api_config.post_url && (
                                                <span className="text-[10px] text-muted-foreground truncate max-w-xs font-mono">
                                                    {env.api_config.post_url}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteEnv(env.id);
                                                }}
                                                className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                            {expandedEnv === env.id ? (
                                                <ChevronUp className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </div>
                                    {expandedEnv === env.id && (
                                        <div className="p-4 border-t border-border/40 space-y-4">
                                            <Input
                                                placeholder="Environment Name (e.g., Production, Staging)"
                                                value={env.name}
                                                onChange={(e) =>
                                                    handleUpdateEnv(env.id, 'name', e.target.value)
                                                }
                                            />
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                                                        <span>POST URL</span>
                                                        <span title="The HTTP POST endpoint of your agent where AgentEval sends the conversation history payload.">
                                                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                                        </span>
                                                    </label>
                                                    <Input
                                                        placeholder="https://api.example.com/chat"
                                                        value={env.api_config.post_url}
                                                        onChange={(e) =>
                                                            handleUpdateEnvApiConfig(
                                                                env.id,
                                                                'post_url',
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                                                        <span>GET URL</span>
                                                        <span title="Optional. The HTTP GET endpoint of your agent used if you require polling for asynchronous message replies.">
                                                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                                        </span>
                                                    </label>
                                                    <Input
                                                        placeholder="https://api.example.com/messages"
                                                        value={env.api_config.get_url}
                                                        onChange={(e) =>
                                                            handleUpdateEnvApiConfig(
                                                                env.id,
                                                                'get_url',
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                                                    <span>Authorization Header</span>
                                                    <span title="Optional. The HTTP Authorization header value sent with requests (e.g. 'Bearer your-api-key').">
                                                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                                    </span>
                                                </label>
                                                <Input
                                                    placeholder="Bearer token..."
                                                    value={env.api_config.auth_header}
                                                    onChange={(e) =>
                                                        handleUpdateEnvApiConfig(
                                                            env.id,
                                                            'auth_header',
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                                                    <span>Payload Template (JSON)</span>
                                                    <span title="The JSON body template sent in the POST request. Use {{history}} to inject the chat list array.">
                                                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                                    </span>
                                                </label>
                                                <textarea
                                                    className="w-full h-24 font-mono bg-[#13161B] rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    value={env.api_config.payload_template}
                                                    onChange={(e) =>
                                                        handleUpdateEnvApiConfig(
                                                            env.id,
                                                            'payload_template',
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                                                    <span>Response Data Path</span>
                                                    <span title="JSON path expression to extract the response text from your agent's API response (e.g., 'choices[0].message.content').">
                                                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                                    </span>
                                                </label>
                                                <Input
                                                    placeholder="data.messages[-1].content"
                                                    value={env.api_config.response_path}
                                                    onChange={(e) =>
                                                        handleUpdateEnvApiConfig(
                                                            env.id,
                                                            'response_path',
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                                                        <span>Polling Interval (ms)</span>
                                                        <span title="The duration to wait between HTTP GET polling requests when checking for asynchronous replies.">
                                                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                                        </span>
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        value={env.api_config.polling_interval}
                                                        onChange={(e) =>
                                                            handleUpdateEnvApiConfig(
                                                                env.id,
                                                                'polling_interval',
                                                                parseInt(e.target.value) || 2000
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                                                        <span>Max Timeout (s)</span>
                                                        <span title="Maximum seconds the system will wait for your agent's API to respond before marking the turn as failed.">
                                                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                                        </span>
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        value={env.api_config.max_timeout}
                                                        onChange={(e) =>
                                                            handleUpdateEnvApiConfig(
                                                                env.id,
                                                                'max_timeout',
                                                                parseInt(e.target.value) || 30
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {project.environments.length === 0 && (
                                <div className="py-12 text-center border-2 border-dashed border-border/50 rounded-xl select-none">
                                    <p className="text-muted-foreground mb-4 text-xs font-semibold">
                                        No environments configured yet.
                                    </p>
                                    <Button onClick={handleAddEnvironment} variant="outline" className="gap-2 font-bold text-xs uppercase">
                                        <Plus className="w-4 h-4" /> Add first environment
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
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
                                        <span className="text-[10px] text-muted-foreground bg-[#272D35] px-2 py-0.5 rounded border border-border/40 font-semibold font-mono">
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
