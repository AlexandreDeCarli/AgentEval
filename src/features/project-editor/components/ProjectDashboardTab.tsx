import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { TrendingUp, CheckCircle2, Clock, Eye } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Mission, TestRun } from '../../../types';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
);

interface ProjectDashboardTabProps {
    projectMissions: Mission[];
    runs: TestRun[];
    setSelectedRun: (run: TestRun | null) => void;
}

export const ProjectDashboardTab: React.FC<ProjectDashboardTabProps> = ({
    projectMissions,
    runs,
    setSelectedRun,
}) => {
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

    const renderTrendChart = () => {
        if (trendRuns.length === 0) {
            return (
                <div className="h-[150px] flex flex-col items-center justify-center text-body text-muted-foreground bg-[#1C2026]/40 border border-dashed border-border/60 rounded-xl select-none animate-fade-in">
                    <TrendingUp className="w-6 h-6 text-slate-500 mb-2 opacity-50" />
                    <span>Run tests to populate the performance trend chart.</span>
                </div>
            );
        }

        const chartData = {
            labels: trendRuns.map((r) => {
                const m = projectMissions.find(mission => mission.id === r.mission_id);
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
                        weight: 'bold' as const,
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
                            const m = projectMissions.find(mission => mission.id === run.mission_id);
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
                            weight: 'bold' as const,
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
                        <h4 className="text-label text-white">Score Trend (Last 15 Runs)</h4>
                    </div>
                    <span className="text-label text-muted-foreground tabular-nums">Scale: {yMin} - {yMax}</span>
                </div>
                <div className="h-[180px] w-full">
                    <Line key={`project-trend-chart-${trendRuns.length}-${sortedCompletedRuns.length}`} data={chartData} options={chartOptions} />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                {/* Success Rate Donut */}
                <div className="border border-border/50 bg-[#1C2026] p-5 rounded-2xl flex items-center justify-between shadow-sm select-none">
                    <div className="space-y-1">
                        <span className="text-label text-slate-400">Success Rate</span>
                        <h3 className="text-3xl font-extrabold text-white tabular-nums">{successRate}%</h3>
                        <p className="text-body text-muted-foreground">
                            {successExecutions} of {totalExecutions} total executions successful.
                        </p>
                    </div>
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <Doughnut 
                            key={`project-doughnut-chart-${successExecutions}-${totalExecutions}`}
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
                            <span className="text-base font-extrabold text-white tabular-nums">{successRate}%</span>
                            <span className="text-label text-slate-400">Pass</span>
                        </div>
                    </div>
                </div>

                {/* Average Score */}
                <div className="border border-border/50 bg-[#1C2026] p-5 rounded-2xl flex flex-col justify-between shadow-sm select-none">
                    <div className="space-y-1">
                        <span className="text-label text-slate-400">Average Evaluation Score</span>
                        <div className="flex items-baseline gap-2">
                            <h3 className={`text-3xl font-extrabold tabular-nums ${
                                averageScore >= 80 ? 'text-emerald-400' : averageScore >= 50 ? 'text-amber-400' : 'text-red-400'
                            }`}>{averageScore}</h3>
                            <span className="text-body text-muted-foreground">/ 100</span>
                        </div>
                        <p className="text-body text-muted-foreground mt-2">
                            Calculated from {evaluatedRuns.length} evaluated test runs.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-label text-slate-400 bg-[#272D35]/50 px-3 py-1.5 rounded-lg border border-border/20 w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Quality Bar</span>
                    </div>
                </div>

                {/* Total Executions */}
                <div className="border border-border/50 bg-[#1C2026] p-5 rounded-2xl flex flex-col justify-between shadow-sm select-none">
                    <div className="space-y-1">
                        <span className="text-label text-slate-400">Executions Overview</span>
                        <h3 className="text-3xl font-extrabold text-white tabular-nums">{totalExecutions}</h3>
                        <p className="text-body text-muted-foreground mt-2">
                            Simulations ran across all registered missions.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-label text-slate-400 bg-[#272D35]/50 px-3 py-1.5 rounded-lg border border-border/20 w-fit">
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
                    <h4 className="text-label text-white">Last 10 Completed Test Runs</h4>
                    <span className="text-label text-muted-foreground bg-[#272D35] px-2 py-0.5 rounded border border-border/40 font-bold tabular-nums">
                        {sortedCompletedRuns.length} completed total
                    </span>
                </div>

                {sortedCompletedRuns.length === 0 ? (
                    <div className="p-12 text-center text-body text-muted-foreground font-bold">
                        No completed runs yet for this project.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-body text-left">
                            <thead className="text-label text-slate-400 bg-[#272D35]/30 border-b border-border/40">
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
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-300 font-mono tabular-nums">
                                                {new Date(run.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-white text-body">
                                                {mission?.titulo || 'Unknown Mission'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={run.status === 'success' ? 'success' : run.status === 'failed' ? 'destructive' : 'secondary'}>
                                                    {run.status.toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300 font-mono tabular-nums">
                                                {Math.floor(run.chat_history.length / 2)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {run.evaluation ? (
                                                    <span className={`font-extrabold tabular-nums ${
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
    );
};
