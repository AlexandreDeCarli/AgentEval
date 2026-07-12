import React, { useMemo } from 'react';
import { Activity, BrainCircuit, MessagesSquare } from 'lucide-react';
import { summarizeRunUsage } from '../features/settings/aiUsageAnalytics';
import { useAiUsageStore } from '../store/useAiUsageStore';

const formatCost = (value: number) => `$${value.toFixed(6)}`;

export const RunAiUsageSummary: React.FC<{ runId: string }> = ({ runId }) => {
    const events = useAiUsageStore((state) => state.events);
    const summary = useMemo(() => summarizeRunUsage(events, runId), [events, runId]);

    if (summary.calls === 0) return null;

    return (
        <section aria-labelledby={`run-ai-usage-${runId}`} className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h4 id={`run-ai-usage-${runId}`} className="text-title">AI Usage for This Run</h4>
                    <p className="text-body text-muted-foreground mt-1">Estimated at paid Gemini Standard rates.</p>
                </div>
                {summary.unpricedCalls > 0 && (
                    <span className="text-label text-amber-300">{summary.unpricedCalls} unpriced</span>
                )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 border border-border rounded-lg divide-x divide-y lg:divide-y-0 divide-border overflow-hidden">
                {[
                    { label: 'Total cost', value: formatCost(summary.totalCostUsd), icon: <Activity className="w-4 h-4 text-primary" /> },
                    { label: 'Conversation', value: formatCost(summary.conversationCostUsd), icon: <MessagesSquare className="w-4 h-4 text-emerald-400" /> },
                    { label: 'Evaluation', value: formatCost(summary.evaluationCostUsd), icon: <BrainCircuit className="w-4 h-4 text-rose-300" /> },
                    { label: 'Input / output', value: `${summary.inputTokens.toLocaleString()} / ${summary.outputTokens.toLocaleString()}`, icon: <span className="text-primary font-mono text-xs">T</span> },
                ].map((item) => (
                    <div key={item.label} className="p-3 sm:p-4 min-w-0">
                        <div className="flex items-center gap-2 text-muted-foreground">{item.icon}<span className="text-label">{item.label}</span></div>
                        <div className="mt-2 text-body font-mono font-bold text-white tabular-nums truncate" title={item.value}>{item.value}</div>
                    </div>
                ))}
            </div>
        </section>
    );
};
