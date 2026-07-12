import React, { useState, useEffect, useMemo } from 'react';
import { useTestRunStore } from '../store/useTestRunStore';
import { useMissionStore } from '../store/useMissionStore';
import { useProjectStore } from '../store/useProjectStore';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { EvaluationReport } from './EvaluationReport';
import { ChatBubble } from '../components/ChatBubble';
import { TestRun } from '../types';
import { DebugLogPanel } from '../components/DebugLogPanel';
import { Trash2, ExternalLink, TrendingUp, Target, Server, Clock } from 'lucide-react';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';

export const TestHistory: React.FC = () => {
    const { runs, deleteRun } = useTestRunStore();
    const { missions } = useMissionStore();
    const { projects } = useProjectStore();

    const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
    const [detailTab, setDetailTab] = useState<'score' | 'chat' | 'logs'>('score');
    const [runToDelete, setRunToDelete] = useState<TestRun | null>(null);

    useEffect(() => {
        if (!selectedRun) {
            setDetailTab('score');
        }
    }, [selectedRun]);

    // Optimize nested lookups by pre-computing Maps
    const missionMap = useMemo(() => new Map(missions.map((m) => [m.id, m])), [missions]);
    const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

    const getMissionTitle = (id: string) => missionMap.get(id)?.titulo || 'Unknown Mission';

    return (
        <div className="p-8 max-w-6xl mx-auto animate-fade-in">
            {/* Header Section (aligned exactly with Projects & All Missions) */}
            <div className="flex justify-between items-center mb-8 select-none">
                <div>
                    <h1 className="text-display text-white">Test History</h1>
                    <p className="text-body text-muted-foreground mt-1">
                        Review past execution logs, conversations, and LLM evaluations.
                    </p>
                </div>
            </div>

            {/* Test History List */}
            {runs.length === 0 ? (
                <div className="p-16 text-center border border-dashed border-border/50 bg-[#1C2026]/40 rounded-2xl select-none text-body flex flex-col items-center justify-center gap-3 animate-fade-in">
                    <TrendingUp className="w-8 h-8 text-zinc-600 opacity-40 animate-pulse" />
                    <span>No tests have been executed yet. Run a mission to populate history logs.</span>
                </div>
            ) : (
                <div className="space-y-4">
                    {runs.map((run) => {
                        const mission = missionMap.get(run.mission_id);
                        const project = mission && mission.project_id ? projectMap.get(mission.project_id) : undefined;
                        const missionTitle = mission?.titulo || 'Unknown Mission';
                        const missionGoal = mission?.mission_goal || 'No description available for this test scenario.';
                        const dateStr = new Date(run.created_at).toLocaleString();
                        const turnsSpent = run.chat_history.filter(m => m.role === 'target').length;
                        
                        return (
                            <div
                                key={run.id}
                                className="border border-border/50 rounded-xl bg-[#1C2026] p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:border-[#4A72FF]/40 hover:bg-[#272D35]/20 transition-all duration-300 shadow-sm gap-4 relative overflow-hidden"
                            >
                                {/* Accent Line */}
                                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#4A72FF]/20 to-transparent opacity-10" />

                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h4 className="text-body font-bold text-white break-words" title={missionTitle}>
                                            {missionTitle}
                                        </h4>
                                        
                                        {/* Project Tag */}
                                        {project && (
                                            <span className="text-label bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700/60 select-none">
                                                {project.name}
                                            </span>
                                        )}
 
                                        {/* Evaluation overall score badge */}
                                        {run.evaluation ? (
                                            <span className="text-label bg-[#4A72FF]/10 border border-[#4A72FF]/20 text-[#4A72FF] px-2.5 py-0.5 rounded select-none tabular-nums">
                                                Score: {run.evaluation.overall_score}/100
                                            </span>
                                        ) : (
                                            <span className="text-label bg-slate-800 text-slate-500 border border-slate-700/60 px-2.5 py-0.5 rounded select-none">
                                                No Score
                                            </span>
                                        )}
 
                                        {/* Success / Failed badge */}
                                        <span className={`px-2 py-0.5 rounded text-label border select-none ${
                                            run.status === 'success'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                                : run.status === 'failed'
                                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                                                : 'bg-slate-800 text-slate-400 border-slate-700/60'
                                        }`}>
                                            {run.status === 'success' ? '✓ Success' : '✗ Failed'}
                                        </span>
                                    </div>
                                    
                                    <p className="text-body text-muted-foreground line-clamp-2 mt-1.5">
                                        {missionGoal}
                                    </p>

                                    <div className="flex flex-wrap gap-2 mt-3 select-none">
                                        <span className="inline-flex items-center gap-1.5 text-label bg-[#272D35] text-slate-300 px-2.5 py-1 rounded-lg border border-white/[0.04] tabular-nums">
                                            <Clock className="w-3.5 h-3.5 text-[#4A72FF]" />
                                            Ran on: {dateStr}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 text-label bg-[#272D35] text-slate-300 px-2.5 py-1 rounded-lg border border-white/[0.04] tabular-nums">
                                            <Target className="w-3.5 h-3.5 text-[#8B5CF6]" />
                                            {turnsSpent} turns
                                        </span>
                                        {run.resolved_variables && Object.keys(run.resolved_variables).length > 0 && (
                                            <span className="inline-flex items-center gap-1.5 text-label bg-[#272D35] text-slate-300 px-2.5 py-1 rounded-lg border border-white/[0.04] tabular-nums">
                                                {Object.keys(run.resolved_variables).length} vars
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 self-end sm:self-center ml-0 sm:ml-4 select-none">
                                    <Button 
                                        onClick={() => setSelectedRun(run)}
                                        className="gap-1.5 bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] hover:scale-[1.02] active:scale-[0.98] text-white h-9 px-4 rounded-lg cursor-pointer transition-all duration-200 shadow-md shadow-[#4A72FF]/10 flex items-center"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" /> Details
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setRunToDelete(run)} 
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer h-9 w-9 p-0 flex items-center justify-center rounded-lg transition-all duration-200"
                                        title="Delete History Record"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {runToDelete && (
                <ConfirmDeleteModal
                    itemType="Test Run"
                    itemName={getMissionTitle(runToDelete.mission_id)}
                    warningDescription="The conversational history, API inspector payloads, and Gemini evaluation score metrics for this run will be permanently deleted."
                    subtitle={`Executed on: ${new Date(runToDelete.created_at).toLocaleString()}`}
                    onConfirm={() => {
                        deleteRun(runToDelete.id);
                        setRunToDelete(null);
                    }}
                    onCancel={() => setRunToDelete(null)}
                />
            )}

            {/* Details Modal */}
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
                                                    <div key={key} className="bg-[#13161B] border border-border/30 p-2.5 rounded-lg flex flex-col justify-between shadow-inner animate-fade-in">
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
                                            <h3 className="text-label text-muted-foreground border-b border-[#272D35] pb-2 select-none mb-3 block">Intelligent Evaluation Report</h3>
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
