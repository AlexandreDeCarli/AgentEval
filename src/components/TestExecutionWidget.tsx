import React from 'react';
import { Link } from 'react-router-dom';
import { useTestExecutionStore } from '../store/useTestExecutionStore';
import { Square, ArrowUpRight, Loader2 } from 'lucide-react';

export const TestExecutionWidget: React.FC = () => {
    const { executions, stopExecution } = useTestExecutionStore();

    // Filtra todas as execuções de testes que estão ativamente rodando
    const activeRuns = Object.values(executions).filter((e) => e.isRunning);

    if (activeRuns.length === 0) {
        return null; // Oculta o widget se não houver execuções ativas
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-80 bg-[#1C2026]/95 backdrop-blur-md border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-xl overflow-hidden animate-modal-scale-in">
            {/* Top Border Glow */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#4A72FF] to-transparent" />
            
            {/* Header */}
            <div className="px-4 py-3 bg-[#13161B]/65 border-b border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative" />
                    </div>
                    <span className="text-xs font-bold text-white tracking-wider uppercase">Active Test Runs</span>
                </div>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-[#4A72FF]/20 text-[#4A72FF] rounded border border-[#4A72FF]/30">
                    {activeRuns.length} {activeRuns.length === 1 ? 'RUN' : 'RUNS'}
                </span>
            </div>

            {/* List of Active Runs */}
            <div className="p-3 max-h-60 overflow-y-auto space-y-2.5">
                {activeRuns.map((run) => (
                    <div 
                        key={run.missionId} 
                        className="p-3 bg-[#13161B]/40 border border-border/30 rounded-lg flex items-center justify-between gap-3 hover:border-[#4A72FF]/30 transition-all duration-200"
                    >
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-[#F9FAFB] truncate" title={run.missionTitle}>
                                {run.missionTitle}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                                <Loader2 className="w-3 h-3 text-[#4A72FF] animate-spin" />
                                <span className="text-[10px] text-muted-foreground font-medium">
                                    Turn {run.turnsCompleted}/{run.maxTurns}
                                </span>
                            </div>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex items-center gap-1 flex-none">
                            <button
                                onClick={() => stopExecution(run.missionId)}
                                className="p-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                                title="Stop Execution"
                            >
                                <Square className="w-3 h-3 fill-current" />
                            </button>
                            <Link
                                to={`/run/${run.missionId}`}
                                className="p-1.5 rounded bg-[#4A72FF]/10 border border-[#4A72FF]/20 text-[#4A72FF] hover:bg-[#4A72FF] hover:text-white transition-all cursor-pointer flex items-center justify-center"
                                title="View Live Runner"
                            >
                                <ArrowUpRight className="w-3 h-3" />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Status */}
            <div className="px-4 py-2 bg-[#13161B]/20 border-t border-border/20 text-[10px] text-muted-foreground flex items-center justify-between font-medium">
                <span>Running in background...</span>
                <span className="text-[#4A72FF] font-semibold">AgentEval Engine</span>
            </div>
        </div>
    );
};
