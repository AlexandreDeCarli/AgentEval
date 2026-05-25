import React, { useState, useEffect } from 'react';
import { useTestRunStore } from '../store/useTestRunStore';
import { useMissionStore } from '../store/useMissionStore';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { EvaluationReport } from './EvaluationReport';
import { ChatBubble } from '../components/ChatBubble';
import { TestRun } from '../types';
import { DebugLogPanel } from '../components/DebugLogPanel';
import { Trash2, ExternalLink, TrendingUp, Target, Server, Clock } from 'lucide-react';

export const TestHistory: React.FC = () => {
    const { runs, deleteRun } = useTestRunStore();
    const { missions } = useMissionStore();

    const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
    const [detailTab, setDetailTab] = useState<'score' | 'chat' | 'logs'>('score');
    const [runToDelete, setRunToDelete] = useState<TestRun | null>(null);

    useEffect(() => {
        if (!selectedRun) {
            setDetailTab('score');
        }
    }, [selectedRun]);

    const getMissionTitle = (id: string) => missions.find(m => m.id === id)?.titulo || 'Unknown Mission';

    return (
        <div className="p-8 max-w-6xl mx-auto animate-fade-in">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-8 select-none">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase">Test History</h1>
                    <p className="text-xs text-muted-foreground mt-1 tracking-wider font-bold uppercase">
                        Review past execution logs, conversations, and LLM evaluations.
                    </p>
                </div>
            </div>

            {/* Test History List */}
            {runs.length === 0 ? (
                <div className="p-16 text-center border border-dashed border-border/50 bg-[#1C2026]/40 rounded-2xl select-none font-semibold text-xs flex flex-col items-center justify-center gap-3 animate-fade-in">
                    <TrendingUp className="w-8 h-8 text-zinc-600 opacity-40 animate-pulse" />
                    <span>No tests have been executed yet. Run a mission to populate history logs.</span>
                </div>
            ) : (
                <div className="space-y-4">
                    {runs.map((run) => {
                        const mission = missions.find(m => m.id === run.mission_id);
                        const missionTitle = mission?.titulo || 'Unknown Mission';
                        const missionGoal = mission?.mission_goal || 'No description available for this test scenario.';
                        const dateStr = new Date(run.created_at).toLocaleString();
                        const turnsSpent = run.chat_history.filter(m => m.role === 'target').length;
                        
                        return (
                            <div
                                key={run.id}
                                className="border border-border/50 rounded-xl bg-[#1C2026] p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:border-[#4A72FF]/40 hover:bg-[#272D35]/20 transition-all duration-300 shadow-sm gap-4"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h4 className="font-bold text-sm text-white truncate" title={missionTitle}>
                                            {missionTitle}
                                        </h4>
                                        
                                        {/* Evaluation overall score badge */}
                                        {run.evaluation ? (
                                            <span className="text-[10px] bg-[#4A72FF]/10 border border-[#4A72FF]/20 text-[#4A72FF] px-2.5 py-0.5 rounded font-extrabold select-none">
                                                Score: {run.evaluation.overall_score}/100
                                            </span>
                                        ) : (
                                            <span className="text-[10px] bg-slate-800 text-slate-500 border border-slate-700/60 px-2.5 py-0.5 rounded font-bold select-none">
                                                No Score
                                            </span>
                                        )}

                                        {/* Success / Failed badge */}
                                        <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider border select-none ${
                                            run.status === 'success'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                                : run.status === 'failed'
                                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                                                : 'bg-slate-800 text-slate-400 border-slate-700/60'
                                        }`}>
                                            {run.status === 'success' ? '✓ Success' : '✗ Failed'}
                                        </span>
                                    </div>
                                    
                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1.5 leading-relaxed">
                                        {missionGoal}
                                    </p>

                                    <div className="flex flex-wrap gap-2 mt-3 select-none">
                                        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-extrabold bg-[#272D35] text-slate-300 px-2.5 py-0.5 rounded border border-white/[0.04]">
                                            <Clock className="w-3 h-3 text-[#4A72FF]" />
                                            Ran on: {dateStr}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-extrabold border border-slate-700 bg-slate-800/40 text-slate-400 px-2.5 py-0.5 rounded">
                                            <Target className="w-3 h-3 text-[#8B5CF6]" />
                                            {turnsSpent} turns
                                        </span>
                                        {run.resolved_variables && Object.keys(run.resolved_variables).length > 0 && (
                                            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-extrabold border border-slate-700 bg-slate-800/40 text-slate-400 px-2.5 py-0.5 rounded">
                                                {Object.keys(run.resolved_variables).length} vars
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 self-end sm:self-center ml-0 sm:ml-4 select-none">
                                    <Button 
                                        onClick={() => setSelectedRun(run)}
                                        className="gap-1 bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] text-white font-bold text-xs uppercase h-8 px-4 rounded-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md shadow-[#4A72FF]/10 flex items-center"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" /> Details
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setRunToDelete(run)} 
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer h-8 w-8 p-0"
                                        title="Delete History Record"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Confirmação de Exclusão de Histórico */}
            {runToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop com blur e animação suave */}
                    <div 
                        className="absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-300 animate-modal-fade-in cursor-pointer"
                        onClick={() => setRunToDelete(null)}
                    />
                    
                    {/* Caixa do Modal Premium */}
                    <div className="relative bg-gradient-to-b from-[#111827] to-[#0b0f19] border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.8),_inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl max-w-sm w-full p-6 z-10 animate-modal-scale-in overflow-hidden text-center space-y-6">
                        {/* Linha de brilho superior destrutivo */}
                        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                        
                        {/* Ícone de aviso destrutivo com efeitos de luz */}
                        <div className="relative flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                            <div className="absolute inset-0 rounded-full bg-red-500/5 animate-ping opacity-75" />
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        
                        {/* Texto descritivo principal */}
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold tracking-tight text-white">Delete Test Run?</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                You are about to permanently delete the execution logs of:
                            </p>
                            <div className="inline-block font-semibold text-white bg-slate-900/60 border border-white/5 px-3 py-1 rounded-lg text-sm max-w-full truncate shadow-inner">
                                "{getMissionTitle(runToDelete.mission_id)}"
                            </div>
                            <span className="text-[10px] text-slate-500 block">
                                Executed on: {new Date(runToDelete.created_at).toLocaleString()}
                            </span>
                        </div>

                        {/* Card de Aviso Crítico com design moderno */}
                        <div className="bg-red-500/[0.03] border-l-2 border-red-500/60 p-4 rounded-r-lg text-left space-y-1">
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">⚠️ Irreversible Action</span>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                The conversational history, API inspector payloads, and Gemini evaluation score metrics for this run will be **permanently deleted**.
                            </p>
                        </div>
                        
                        {/* Botões de Ação Simétricos e Táteis */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setRunToDelete(null)}
                                className="flex-1 px-4 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-semibold text-xs tracking-wide uppercase transition-all duration-200 cursor-pointer active:scale-[0.98] border-b-[2px] border-b-black/20 hover:border-white/[0.12]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    deleteRun(runToDelete.id);
                                    setRunToDelete(null);
                                }}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-bold text-xs tracking-wide uppercase shadow-[0_4px_12px_rgba(239,68,68,0.25)] hover:shadow-[0_4px_16px_rgba(239,68,68,0.35)] hover:-translate-y-[1px] transition-all duration-200 cursor-pointer active:scale-[0.98] active:translate-y-0"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
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
                                            <h3 className="font-bold text-xs uppercase text-muted-foreground tracking-wider border-b border-[#272D35] pb-2 select-none">Intelligent Evaluation Report</h3>
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
