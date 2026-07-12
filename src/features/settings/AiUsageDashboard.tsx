import React, { useEffect, useMemo, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    ArrowDownToLine,
    ArrowUpFromLine,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    Trash2,
} from 'lucide-react';
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    ChartOptions,
    Legend,
    LinearScale,
    Title,
    Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Button } from '../../components/ui/Button';
import { ConfirmDeleteModal } from '../../components/ui/ConfirmDeleteModal';
import { GEMINI_PRICING_DATE } from '../../config/geminiModels';
import { useAiUsageStore } from '../../store/useAiUsageStore';
import { useMissionStore } from '../../store/useMissionStore';
import { useProjectStore } from '../../store/useProjectStore';
import { AiRoutine, AiUsageEvent } from '../../types';
import {
    AI_ROUTINES,
    AI_ROUTINE_LABELS,
    AiUsagePeriod,
    buildCostBuckets,
    filterUsageByPeriod,
    summarizeAiUsage,
} from './aiUsageAnalytics';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const PAGE_SIZE = 25;
const PERIODS: AiUsagePeriod[] = ['24h', '7d', '30d', 'all'];
const ROUTINE_COLORS: Record<AiRoutine, string> = {
    mission_generation: '#4A72FF',
    tester_conversation: '#10B981',
    gemini_target: '#F59E0B',
    evaluation: '#F43F5E',
};

const formatTokens = (value: number) =>
    new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const formatEventCost = (value: number | null) => {
    if (value === null) return 'Unpriced';
    if (value > 0 && value < 0.000001) return '<$0.000001';
    return `$${value.toFixed(6)}`;
};

const formatTotalCost = (value: number) => `$${value.toFixed(4)}`;

const usePrefersReducedMotion = () => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updatePreference = () => setPrefersReducedMotion(media.matches);
        updatePreference();
        media.addEventListener('change', updatePreference);
        return () => media.removeEventListener('change', updatePreference);
    }, []);
    return prefersReducedMotion;
};

const Metric = ({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) => (
    <div className="min-w-0 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="text-label">{label}</span>
        </div>
        <div className="mt-2 text-title text-white font-mono tabular-nums truncate" title={value}>
            {value}
        </div>
    </div>
);

const ContextCell = ({ event, label }: { event: AiUsageEvent; label: string }) => {
    return (
        <div className="max-w-48">
            <div className="truncate text-slate-200" title={label}>
                {label}
            </div>
            {event.runId && (
                <div className="text-[10px] text-muted-foreground font-mono truncate" title={event.runId}>
                    run {event.runId.slice(0, 8)}
                </div>
            )}
        </div>
    );
};

export const AiUsageDashboard: React.FC = () => {
    const events = useAiUsageStore((state) => state.events);
    const clearUsage = useAiUsageStore((state) => state.clearUsage);
    const isHydrating = useAiUsageStore((state) => state.isHydrating);
    const storageError = useAiUsageStore((state) => state.storageError);
    const projects = useProjectStore((state) => state.projects);
    const missions = useMissionStore((state) => state.missions);
    const [period, setPeriod] = useState<AiUsagePeriod>('30d');
    const [page, setPage] = useState(0);
    const [confirmClear, setConfirmClear] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const prefersReducedMotion = usePrefersReducedMotion();

    const filteredEvents = useMemo(
        () => filterUsageByPeriod(events, period, now).sort((left, right) => right.occurredAt - left.occurredAt),
        [events, now, period]
    );
    const summary = useMemo(() => summarizeAiUsage(filteredEvents), [filteredEvents]);
    const buckets = useMemo(() => buildCostBuckets(events, period, now), [events, now, period]);
    const pageCount = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
    const pageEvents = filteredEvents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const routineCosts = useMemo(
        () => AI_ROUTINES.reduce<Record<AiRoutine, number>>((totals, routine) => {
            totals[routine] = filteredEvents.reduce(
                (total, event) => total + (event.routine === routine ? event.estimatedCostUsd || 0 : 0),
                0
            );
            return totals;
        }, {
            mission_generation: 0,
            tester_conversation: 0,
            gemini_target: 0,
            evaluation: 0,
        }),
        [filteredEvents]
    );
    const chartDescription = `${period === 'all' ? 'All recorded usage' : `Last ${period}`}. Total ${formatTotalCost(summary.estimatedCostUsd)}. ${AI_ROUTINES.map(
        (routine) => `${AI_ROUTINE_LABELS[routine]} ${formatEventCost(routineCosts[routine])}`
    ).join(', ')}.`;
    const projectNames = useMemo(
        () => new Map(projects.map((project) => [project.id, project.name])),
        [projects]
    );
    const missionNames = useMemo(
        () => new Map(missions.map((mission) => [mission.id, mission.titulo])),
        [missions]
    );

    useEffect(() => setPage(0), [period]);
    useEffect(() => {
        setNow(Date.now());
        const intervalId = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => window.clearInterval(intervalId);
    }, [events, period]);
    useEffect(() => {
        if (page >= pageCount) setPage(pageCount - 1);
    }, [page, pageCount]);

    const chartData = useMemo(
        () => ({
            labels: buckets.map((bucket) => bucket.label),
            datasets: AI_ROUTINES.map((routine) => ({
                label: AI_ROUTINE_LABELS[routine],
                data: buckets.map((bucket) => bucket.costs[routine]),
                backgroundColor: ROUTINE_COLORS[routine],
                borderRadius: 2,
                borderSkipped: false as const,
                maxBarThickness: 34,
            })),
        }),
        [buckets]
    );

    const chartOptions: ChartOptions<'bar'> = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: prefersReducedMotion ? 0 : 180 },
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: '#9CA3AF', maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
                    border: { color: '#2D3036' },
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    grid: { color: 'rgba(156, 163, 175, 0.10)' },
                    ticks: {
                        color: '#9CA3AF',
                        callback: (value) => `$${Number(value).toFixed(3)}`,
                    },
                    border: { display: false },
                    title: { display: true, text: 'Estimated cost (USD)', color: '#9CA3AF' },
                },
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'start',
                    labels: { color: '#F9FAFB', usePointStyle: true, boxWidth: 8, boxHeight: 8 },
                },
                tooltip: {
                    backgroundColor: '#13161B',
                    borderColor: '#2D3036',
                    borderWidth: 1,
                    titleColor: '#F9FAFB',
                    bodyColor: '#F9FAFB',
                    callbacks: {
                        label: (context) => `${context.dataset.label}: $${Number(context.raw).toFixed(6)}`,
                    },
                },
            },
        }),
        [prefersReducedMotion]
    );

    return (
        <section className="space-y-5" aria-labelledby="ai-usage-title">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h2 id="ai-usage-title" className="text-title text-white">AI Usage & Costs</h2>
                    <p className="text-body text-muted-foreground mt-1 max-w-[70ch]">
                        Paid Standard rate estimates from Gemini token metadata. Values may differ
                        from your actual Google invoice or free-tier usage.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-border bg-card p-1" role="group" aria-label="Usage period">
                        {PERIODS.map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setPeriod(value)}
                                aria-pressed={period === value}
                                className={`min-h-11 px-3 rounded-md text-body font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                    period === value
                                        ? 'bg-[#4A72FF] text-white'
                                        : 'text-muted-foreground hover:text-white hover:bg-muted'
                                }`}
                            >
                                {value === 'all' ? 'All' : value}
                            </button>
                        ))}
                    </div>
                    <Button
                        variant="ghost"
                        size="md"
                        onClick={() => setConfirmClear(true)}
                        disabled={events.length === 0}
                        className="min-h-11 gap-2 text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
                    >
                        <Trash2 className="w-4 h-4" /> Clear history
                    </Button>
                </div>
            </div>

            {storageError && (
                <div role="alert" className="flex items-start gap-3 rounded-lg border border-rose-500/25 bg-rose-500/[0.05] p-4">
                    <AlertTriangle className="w-4 h-4 text-rose-300 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-body font-bold text-rose-100">Usage history could not be saved</p>
                        <p className="text-body text-rose-100/80 mt-0.5">{storageError}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border border border-border rounded-lg bg-card overflow-hidden">
                <Metric icon={<DollarSign className="w-4 h-4 text-primary" />} label="Estimated cost" value={formatTotalCost(summary.estimatedCostUsd)} />
                <Metric icon={<ArrowDownToLine className="w-4 h-4 text-emerald-400" />} label="Input tokens" value={formatTokens(summary.inputTokens)} />
                <Metric icon={<ArrowUpFromLine className="w-4 h-4 text-amber-300" />} label="Output + thinking" value={formatTokens(summary.outputTokens)} />
                <Metric icon={<Activity className="w-4 h-4 text-rose-300" />} label="Gemini calls" value={summary.calls.toLocaleString()} />
            </div>

            {summary.unpricedCalls > 0 && (
                <div role="status" className="flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.05] p-4">
                    <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                    <p className="text-body text-amber-100/90">
                        {summary.unpricedCalls} call{summary.unpricedCalls === 1 ? '' : 's'} could not be priced.
                        Token totals include them; the USD total does not.
                    </p>
                </div>
            )}

            <div className="border border-border rounded-lg bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 id="usage-chart-title" className="text-body font-bold text-white">Estimated Cost by Routine</h3>
                    <span className="text-label text-muted-foreground">Pricing verified {GEMINI_PRICING_DATE}</span>
                </div>
                {isHydrating ? (
                    <div className="h-80 flex items-center justify-center text-body text-muted-foreground" role="status">
                        Loading usage history...
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="h-80 flex flex-col items-center justify-center text-center border border-dashed border-border rounded-lg px-6">
                        <Activity className="w-7 h-7 text-muted-foreground mb-3" />
                        <p className="text-body font-bold text-white">No Gemini usage in this period</p>
                        <p className="text-body text-muted-foreground mt-1 max-w-md">
                            Run a mission or generate missions with AI to start the usage ledger.
                        </p>
                    </div>
                ) : (
                    <figure className="h-80 sm:h-96" role="img" aria-labelledby="usage-chart-title" aria-describedby="usage-chart-description">
                        <Bar data={chartData} options={chartOptions} aria-hidden="true" />
                        <figcaption id="usage-chart-description" className="sr-only">{chartDescription}</figcaption>
                    </figure>
                )}
            </div>

            <div className="border border-border rounded-lg bg-card overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-border">
                    <div>
                        <h3 className="text-body font-bold text-white">Usage Ledger</h3>
                        <p className="text-body text-muted-foreground mt-0.5">Newest calls first</p>
                    </div>
                    <span className="text-label text-muted-foreground">{filteredEvents.length} events</span>
                </div>
                <div className="sm:hidden divide-y divide-border/60">
                    {pageEvents.map((event) => (
                        <article key={event.id} className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 text-body font-bold text-white">
                                        <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: ROUTINE_COLORS[event.routine] }} />
                                        <span className="truncate">{AI_ROUTINE_LABELS[event.routine]}</span>
                                    </div>
                                    <p className="text-body text-muted-foreground mt-1 tabular-nums">
                                        {new Date(event.occurredAt).toLocaleString()}
                                    </p>
                                </div>
                                <span className={`text-body font-mono tabular-nums font-bold whitespace-nowrap ${event.estimatedCostUsd === null ? 'text-amber-300' : 'text-white'}`}>
                                    {formatEventCost(event.estimatedCostUsd)}
                                </span>
                            </div>
                            <div className="text-body text-slate-200 break-words">
                                {(event.missionId && missionNames.get(event.missionId)) ||
                                    (event.projectId && projectNames.get(event.projectId)) ||
                                    'Global'}
                            </div>
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-body">
                                <div className="min-w-0">
                                    <dt className="text-muted-foreground">Model</dt>
                                    <dd className="font-mono text-slate-300 truncate" title={event.resolvedModel}>
                                        {event.resolvedModel.replace(/^models\//, '')}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Input / output</dt>
                                    <dd className="font-mono tabular-nums text-slate-300">
                                        {event.inputTokens.toLocaleString()} / {event.outputTokens.toLocaleString()}
                                    </dd>
                                </div>
                            </dl>
                        </article>
                    ))}
                    {pageEvents.length === 0 && (
                        <p className="px-4 py-10 text-center text-body text-muted-foreground">No usage events match this period.</p>
                    )}
                </div>
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-xs">
                        <thead className="bg-background/60 text-muted-foreground">
                            <tr>
                                {['Date / time', 'Routine', 'Model', 'Context', 'Input', 'Output', 'Cost (USD)'].map((heading) => (
                                    <th key={heading} scope="col" className="px-4 py-3 text-label">{heading}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                            {pageEvents.map((event) => (
                                <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap text-slate-300 tabular-nums">
                                        {new Date(event.occurredAt).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className="inline-flex items-center gap-2 text-slate-200">
                                            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: ROUTINE_COLORS[event.routine] }} />
                                            {AI_ROUTINE_LABELS[event.routine]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-slate-300 max-w-48 truncate" title={event.resolvedModel}>
                                        {event.resolvedModel.replace(/^models\//, '')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <ContextCell
                                            event={event}
                                            label={
                                                (event.missionId && missionNames.get(event.missionId)) ||
                                                (event.projectId && projectNames.get(event.projectId)) ||
                                                'Global'
                                            }
                                        />
                                    </td>
                                    <td className="px-4 py-3 font-mono tabular-nums text-slate-300">{event.inputTokens.toLocaleString()}</td>
                                    <td className="px-4 py-3 font-mono tabular-nums text-slate-300">{event.outputTokens.toLocaleString()}</td>
                                    <td className={`px-4 py-3 font-mono tabular-nums font-bold ${event.estimatedCostUsd === null ? 'text-amber-300' : 'text-white'}`}>
                                        {formatEventCost(event.estimatedCostUsd)}
                                    </td>
                                </tr>
                            ))}
                            {pageEvents.length === 0 && (
                                <tr><td colSpan={7} className="px-4 py-10 text-center text-body text-muted-foreground">No usage events match this period.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background/30">
                    <span className="text-body text-muted-foreground">
                        Page {page + 1} of {pageCount}
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="min-w-11 min-h-11" onClick={() => setPage((value) => value - 1)} disabled={page === 0} aria-label="Previous usage page">
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="min-w-11 min-h-11" onClick={() => setPage((value) => value + 1)} disabled={page + 1 >= pageCount} aria-label="Next usage page">
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {confirmClear && (
                <ConfirmDeleteModal
                    itemType="Usage History"
                    itemName="All AI usage events"
                    warningDescription="Token and estimated cost history will be permanently removed. Projects, missions, and test runs are not affected."
                    onCancel={() => setConfirmClear(false)}
                    onConfirm={() => {
                        void clearUsage()
                            .then(() => setConfirmClear(false))
                            .catch(() => undefined);
                    }}
                />
            )}
        </section>
    );
};
