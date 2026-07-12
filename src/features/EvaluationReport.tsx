import React, { useState } from 'react';
import { Evaluation, Mission } from '../types';
import { Copy, Check, Info, AlertTriangle, AlertCircle, Sparkles, Clock } from 'lucide-react';
import { RunAiUsageSummary } from '../components/RunAiUsageSummary';

interface Props {
    evaluation: Evaluation;
    mission?: Mission;
    runId?: string;
}

export const EvaluationReport: React.FC<Props> = ({ evaluation, mission, runId }) => {
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const handleCopy = (text: string, id: number) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const scoreColor = evaluation.overall_score >= 80 ? 'bg-green-500/10 text-green-500 border-green-500/20'
        : evaluation.overall_score >= 50 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
            : 'bg-red-500/10 text-red-500 border-red-500/20';

    const getSeverityDetails = (sev: string) => {
        const normalized = (sev || '').toLowerCase();
        if (normalized === 'critico' || normalized === 'critical') {
            return { 
                label: 'Critical',
                icon: <AlertTriangle className="w-4 h-4 text-red-500" />, 
                color: 'text-red-400 bg-red-500/10 border-red-500/20' 
            };
        }
        if (normalized === 'importante' || normalized === 'important') {
            return { 
                label: 'Important',
                icon: <AlertCircle className="w-4 h-4 text-amber-500" />, 
                color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' 
            };
        }
        return { 
            label: 'Minor',
            icon: <Sparkles className="w-4 h-4 text-blue-500" />, 
            color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' 
        };
    };

    return (
        <div className="space-y-8">
            {/* Header: Score & Metrics */}
            <div className="flex flex-wrap items-center gap-6 p-6 bg-card border border-border rounded-xl shadow-sm">
                <div className={`text-5xl font-extrabold tabular-nums flex items-center justify-center w-24 h-24 rounded-full border-4 ${scoreColor} shrink-0`}>
                    {evaluation.overall_score}
                </div>
                <div className="flex-1 min-w-[200px]">
                    <h3 className="text-title mb-1">Overall Performance</h3>
                    <p className="text-body text-muted-foreground flex items-center gap-2 mb-3">
                        <Info className="w-4 h-4 inline" /> AI Evaluator Assessment
                    </p>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md text-label border border-border tabular-nums">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <span>First Resp: {(evaluation.metrics.avg_time_to_first_response_ms / 1000).toFixed(1)}s</span>
                        </div>
                        <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md text-label border border-border tabular-nums">
                            <Clock className="w-4 h-4 text-purple-500" />
                            <span>Avg Complete: {(evaluation.metrics.avg_time_to_complete_response_ms / 1000).toFixed(1)}s</span>
                        </div>
                    </div>
                </div>
            </div>

            {runId && <RunAiUsageSummary runId={runId} />}

            {/* Summary */}
            <div>
                <h4 className="text-title mb-3">Executive Summary</h4>
                <div className="bg-muted p-5 rounded-lg text-body border border-border max-w-[75ch]">
                    {evaluation.summary}
                </div>
            </div>

            {/* Criteria Breakdown */}
            <div>
                <h4 className="text-title mb-4 border-b pb-2">Criteria Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {evaluation.criteria_scores.map((c, i) => {
                        const critName = mission?.evaluation_criteria?.find(mc => mc.id === c.criterion_id)?.name || c.criterion_id;
                        return (
                            <div key={i} className="border border-border rounded-lg p-4 bg-card shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-body font-semibold text-foreground">{critName}</span>
                                    <span className={`font-bold px-2 py-0.5 rounded text-label tabular-nums ${c.score >= 8 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : c.score >= 5 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        {c.score}/10
                                    </span>
                                </div>
                                <p className="text-body text-muted-foreground leading-snug max-w-[75ch]">{c.justification}</p>
                            </div>
                        );
                    })}
                    {evaluation.criteria_scores.length === 0 && (
                        <p className="text-body text-muted-foreground italic">No criteria scores provided.</p>
                    )}
                </div>
            </div>

            {/* Prompt Improvements */}
            <div>
                <h4 className="text-title mb-4 border-b pb-2">Targeted Prompt Improvements</h4>
                <div className="space-y-4">
                    {evaluation.prompt_improvements.map((pi, i) => {
                        const sev = getSeverityDetails(pi.severity);
                        return (
                            <div key={i} className="border border-border rounded-lg overflow-hidden shadow-sm bg-card">
                                <div className={`flex items-center justify-between px-4 py-2 border-b ${sev.color}`}>
                                    <div className="flex items-center gap-2 font-semibold text-body capitalize">
                                        {sev.icon} {sev.label} Issue
                                    </div>
                                    <button onClick={() => handleCopy(pi.suggested_text, i)} className="flex items-center gap-1 text-label hover:opacity-70 transition-opacity">
                                        {copiedId === i ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy Fix</>}
                                    </button>
                                </div>
                                <div className="p-4 space-y-3">
                                    <p className="text-body font-medium max-w-[75ch]">{pi.justification}</p>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-label text-muted-foreground mb-1">Target Statement</div>
                                            <pre className="bg-red-500/10 text-red-400 p-3 rounded text-xs font-mono overflow-x-auto border border-red-500/20 whitespace-pre-wrap">
                                                - {pi.target_text}
                                            </pre>
                                        </div>
                                        <div>
                                            <div className="text-label text-muted-foreground mb-1">Suggested Replacement</div>
                                            <pre className="bg-green-500/10 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto border border-green-500/20 whitespace-pre-wrap">
                                                + {pi.suggested_text}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {evaluation.prompt_improvements.length === 0 && (
                        <div className="py-6 text-center border-2 border-dashed border-border rounded-lg text-muted-foreground">
                                                            <Sparkles className="w-8 h-8 mx-auto mb-2 text-blue-400 opacity-50" />
                                                            <p className="text-body">No improvements suggested! The prompt looks solid.</p>
                                                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
