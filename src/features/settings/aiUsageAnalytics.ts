import { AiRoutine, AiUsageEvent } from '../../types';

export type AiUsagePeriod = '24h' | '7d' | '30d' | 'all';

export const AI_ROUTINES: AiRoutine[] = [
    'mission_generation',
    'tester_conversation',
    'gemini_target',
    'evaluation',
];

export const AI_ROUTINE_LABELS: Record<AiRoutine, string> = {
    mission_generation: 'Mission Generation',
    tester_conversation: 'Tester Conversation',
    gemini_target: 'Gemini Target',
    evaluation: 'Evaluation',
};

export interface AiUsageSummary {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    unpricedCalls: number;
}

export interface RunUsageSummary extends AiUsageSummary {
    totalCostUsd: number;
    conversationCostUsd: number;
    evaluationCostUsd: number;
}

export interface AiCostBucket {
    key: string;
    label: string;
    startAt: number;
    costs: Record<AiRoutine, number>;
    totalCostUsd: number;
}

const getPeriodStart = (period: Exclude<AiUsagePeriod, 'all'>, now: number): number => {
    if (period === '24h') return startOfHour(now) - 23 * 60 * 60 * 1000;
    const date = new Date(startOfDay(now));
    date.setDate(date.getDate() - (period === '7d' ? 6 : 29));
    return date.getTime();
};

export const filterUsageByPeriod = (
    events: AiUsageEvent[],
    period: AiUsagePeriod,
    now = Date.now()
): AiUsageEvent[] => {
    if (period === 'all') return [...events];
    const startAt = getPeriodStart(period, now);
    return events.filter((event) => event.occurredAt >= startAt && event.occurredAt <= now);
};

export const summarizeAiUsage = (events: AiUsageEvent[]): AiUsageSummary =>
    events.reduce<AiUsageSummary>(
        (summary, event) => ({
            calls: summary.calls + 1,
            inputTokens: summary.inputTokens + event.inputTokens,
            outputTokens: summary.outputTokens + event.outputTokens,
            estimatedCostUsd: summary.estimatedCostUsd + (event.estimatedCostUsd || 0),
            unpricedCalls: summary.unpricedCalls + (event.pricingStatus === 'priced' ? 0 : 1),
        }),
        { calls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, unpricedCalls: 0 }
    );

export const summarizeRunUsage = (
    events: AiUsageEvent[],
    runId: string
): RunUsageSummary => {
    const runEvents = events.filter((event) => event.runId === runId);
    const summary = summarizeAiUsage(runEvents);
    const conversationCostUsd = runEvents.reduce(
        (total, event) =>
            event.routine === 'tester_conversation' || event.routine === 'gemini_target'
                ? total + (event.estimatedCostUsd || 0)
                : total,
        0
    );
    const evaluationCostUsd = runEvents.reduce(
        (total, event) =>
            event.routine === 'evaluation' ? total + (event.estimatedCostUsd || 0) : total,
        0
    );

    return {
        ...summary,
        totalCostUsd: summary.estimatedCostUsd,
        conversationCostUsd,
        evaluationCostUsd,
    };
};

const startOfHour = (timestamp: number) => {
    const date = new Date(timestamp);
    date.setMinutes(0, 0, 0);
    return date.getTime();
};

const startOfDay = (timestamp: number) => {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
};

const startOfMonth = (timestamp: number) => {
    const date = new Date(timestamp);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
};

const emptyCosts = (): Record<AiRoutine, number> => ({
    mission_generation: 0,
    tester_conversation: 0,
    gemini_target: 0,
    evaluation: 0,
});

const createBucket = (startAt: number, period: AiUsagePeriod): AiCostBucket => {
    const date = new Date(startAt);
    const label =
        period === '24h'
            ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : period === 'all'
              ? date.toLocaleDateString([], { month: 'short', year: '2-digit' })
              : date.toLocaleDateString([], { month: 'short', day: 'numeric' });

    return { key: String(startAt), label, startAt, costs: emptyCosts(), totalCostUsd: 0 };
};

export const buildCostBuckets = (
    events: AiUsageEvent[],
    period: AiUsagePeriod,
    now = Date.now()
): AiCostBucket[] => {
    const buckets: AiCostBucket[] = [];

    if (period === '24h') {
        const finalHour = startOfHour(now);
        for (let offset = 23; offset >= 0; offset -= 1) {
            buckets.push(createBucket(finalHour - offset * 60 * 60 * 1000, period));
        }
    } else if (period === '7d' || period === '30d') {
        const days = period === '7d' ? 7 : 30;
        const finalDay = startOfDay(now);
        for (let offset = days - 1; offset >= 0; offset -= 1) {
            const date = new Date(finalDay);
            date.setDate(date.getDate() - offset);
            buckets.push(createBucket(date.getTime(), period));
        }
    } else if (events.length > 0) {
        const minOccurredAt = events.reduce(
            (minimum, event) => Math.min(minimum, event.occurredAt),
            events[0].occurredAt
        );
        const firstMonth = startOfMonth(minOccurredAt);
        const finalMonth = startOfMonth(now);
        const cursor = new Date(firstMonth);
        while (cursor.getTime() <= finalMonth) {
            buckets.push(createBucket(cursor.getTime(), period));
            cursor.setMonth(cursor.getMonth() + 1);
        }
    }

    const bucketMap = new Map(buckets.map((bucket) => [bucket.startAt, bucket]));
    const visibleEvents = filterUsageByPeriod(events, period, now);
    visibleEvents.forEach((event) => {
        const bucketStart =
            period === '24h'
                ? startOfHour(event.occurredAt)
                : period === 'all'
                  ? startOfMonth(event.occurredAt)
                  : startOfDay(event.occurredAt);
        const bucket = bucketMap.get(bucketStart);
        if (!bucket || event.estimatedCostUsd === null) return;
        bucket.costs[event.routine] += event.estimatedCostUsd;
        bucket.totalCostUsd += event.estimatedCostUsd;
    });

    return buckets;
};
