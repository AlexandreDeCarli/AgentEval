export const GEMINI_PRICING_VERSION = 'gemini-standard-2026-08-13';
export const GEMINI_PRICING_DATE = '2026-08-13';
export const GEMINI_PRICING_SOURCE = 'https://ai.google.dev/gemini-api/docs/pricing';

export interface GeminiTokenRate {
    inputPerMillionUsd: number;
    outputPerMillionUsd: number;
}

export interface GeminiModelInfo {
    id: string;
    name: string;
    isFreeTier: boolean;
    inputCostPaid: string;
    outputCostPaid: string;
    rpmLimitFree?: number;
    rpdLimitFree?: number;
    tpmLimitFree?: number;
    description: string;
    contextLimit: string;
    releaseDate?: string;
    knowledgeCutoff?: string;
    standardRate: GeminiTokenRate;
    longContextRate?: GeminiTokenRate & { promptThresholdTokens: number };
}

export const GEMINI_MODELS: GeminiModelInfo[] = [
    {
        id: 'gemini-3.7-flash',
        name: 'Gemini 3.7 Flash',
        isFreeTier: true,
        inputCostPaid: '$0.75',
        outputCostPaid: '$3.75',
        rpmLimitFree: 5,
        rpdLimitFree: 20,
        tpmLimitFree: 250_000,
        description: 'Frontier performance Flash model with advanced reasoning, coding, and multi-step agentic capabilities.',
        contextLimit: '1M tokens',
        releaseDate: 'Aug. 13, 2026',
        knowledgeCutoff: 'Jan. 2025',
        standardRate: { inputPerMillionUsd: 0.75, outputPerMillionUsd: 3.75 },
    },
    {
        id: 'gemini-3.6-flash',
        name: 'Gemini 3.6 Flash',
        isFreeTier: true,
        inputCostPaid: '$1.50',
        outputCostPaid: '$7.50',
        rpmLimitFree: 5,
        rpdLimitFree: 20,
        tpmLimitFree: 250_000,
        description: 'Workhorse model optimized for speed, coding, and multi-step agentic workflows.',
        contextLimit: '1M tokens',
        releaseDate: 'Jul. 21, 2026',
        knowledgeCutoff: 'Jan. 2025',
        standardRate: { inputPerMillionUsd: 1.5, outputPerMillionUsd: 7.5 },
    },
    {
        id: 'gemini-3.5-flash',
        name: 'Gemini 3.5 Flash',
        isFreeTier: true,
        inputCostPaid: '$1.50',
        outputCostPaid: '$9.00',
        rpmLimitFree: 5,
        rpdLimitFree: 20,
        tpmLimitFree: 250_000,
        description: 'Frontier-performance Flash model for agentic and coding tasks.',
        contextLimit: '1M tokens',
        releaseDate: 'May 19, 2026',
        knowledgeCutoff: 'Jan. 2025',
        standardRate: { inputPerMillionUsd: 1.5, outputPerMillionUsd: 9 },
    },
    {
        id: 'gemini-3.5-flash-lite',
        name: 'Gemini 3.5 Flash-Lite (Default)',
        isFreeTier: true,
        inputCostPaid: '$0.30',
        outputCostPaid: '$2.50',
        rpmLimitFree: 15,
        rpdLimitFree: 500,
        tpmLimitFree: 250_000,
        description: 'Ultra-fast, cost-efficient model for high-throughput automation and sub-agents.',
        contextLimit: '1M tokens',
        releaseDate: 'Jul. 21, 2026',
        knowledgeCutoff: 'Jan. 2025',
        standardRate: { inputPerMillionUsd: 0.3, outputPerMillionUsd: 2.5 },
    },
    {
        id: 'gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro Preview',
        isFreeTier: false,
        inputCostPaid: '$2.00 (<=200K) / $4.00 (>200K)',
        outputCostPaid: '$12.00 (<=200K) / $18.00 (>200K)',
        description: 'Deep reasoning model for complex multimodal workflows, software engineering, and tool use.',
        contextLimit: '1M tokens',
        releaseDate: 'Feb. 12, 2026',
        knowledgeCutoff: 'Jan. 2025',
        standardRate: { inputPerMillionUsd: 2, outputPerMillionUsd: 12 },
        longContextRate: {
            promptThresholdTokens: 200_000,
            inputPerMillionUsd: 4,
            outputPerMillionUsd: 18,
        },
    },
    {
        id: 'gemini-3.1-flash-lite',
        name: 'Gemini 3.1 Flash-Lite',
        isFreeTier: true,
        inputCostPaid: '$0.25 (Text) / $0.50 (Audio)',
        outputCostPaid: '$1.50',
        rpmLimitFree: 15,
        rpdLimitFree: 500,
        tpmLimitFree: 250_000,
        description: 'Low-latency model optimized for high-volume tasks.',
        contextLimit: '1M tokens',
        releaseDate: 'May 7, 2026',
        knowledgeCutoff: 'Jan. 2025',
        standardRate: { inputPerMillionUsd: 0.25, outputPerMillionUsd: 1.5 },
    },
    {
        id: 'gemini-3-flash-preview',
        name: 'Gemini 3 Flash Preview',
        isFreeTier: true,
        inputCostPaid: '$0.50',
        outputCostPaid: '$3.00',
        rpmLimitFree: 5,
        rpdLimitFree: 20,
        tpmLimitFree: 250_000,
        description: 'Fast reasoning model with strong agentic capabilities.',
        contextLimit: '1M tokens',
        releaseDate: 'Dec. 17, 2025',
        knowledgeCutoff: 'Jan. 2025',
        standardRate: { inputPerMillionUsd: 0.5, outputPerMillionUsd: 3 },
    },
    {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        isFreeTier: false,
        inputCostPaid: '$1.25 (<=200K) / $2.50 (>200K)',
        outputCostPaid: '$10.00 (<=200K) / $15.00 (>200K)',
        description: 'Advanced reasoning model for complex analysis and coding.',
        contextLimit: '2M tokens',
        releaseDate: 'Jun. 17, 2025',
        knowledgeCutoff: 'Jan. 2025',
        standardRate: { inputPerMillionUsd: 1.25, outputPerMillionUsd: 10 },
        longContextRate: {
            promptThresholdTokens: 200_000,
            inputPerMillionUsd: 2.5,
            outputPerMillionUsd: 15,
        },
    },
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        isFreeTier: true,
        inputCostPaid: '$0.30',
        outputCostPaid: '$2.50',
        rpmLimitFree: 5,
        rpdLimitFree: 20,
        tpmLimitFree: 250_000,
        description: 'Hybrid reasoning model with a 1M-token context window.',
        contextLimit: '1M tokens',
        releaseDate: 'Jun. 9, 2025',
        knowledgeCutoff: 'Jan. 2025',
        standardRate: { inputPerMillionUsd: 0.3, outputPerMillionUsd: 2.5 },
    },
    {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash-Lite',
        isFreeTier: true,
        inputCostPaid: '$0.10',
        outputCostPaid: '$0.40',
        rpmLimitFree: 10,
        rpdLimitFree: 20,
        tpmLimitFree: 250_000,
        description: 'Cost-efficient model for high-throughput workloads.',
        contextLimit: '1M tokens',
        releaseDate: 'Jul. 14, 2025',
        knowledgeCutoff: 'Jan. 2025',
        standardRate: { inputPerMillionUsd: 0.1, outputPerMillionUsd: 0.4 },
    },
    {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        isFreeTier: true,
        inputCostPaid: '$0.10',
        outputCostPaid: '$0.40',
        rpmLimitFree: 15,
        rpdLimitFree: 1500,
        tpmLimitFree: 1_000_000,
        description: 'Next generation multimodal workhorse model with high speed and multimodal search.',
        contextLimit: '1M tokens',
        releaseDate: 'Feb. 5, 2025',
        knowledgeCutoff: 'Aug. 2024',
        standardRate: { inputPerMillionUsd: 0.1, outputPerMillionUsd: 0.4 },
    },
    {
        id: 'gemini-2.0-flash-lite',
        name: 'Gemini 2.0 Flash-Lite',
        isFreeTier: true,
        inputCostPaid: '$0.075',
        outputCostPaid: '$0.30',
        rpmLimitFree: 30,
        rpdLimitFree: 1500,
        tpmLimitFree: 1_000_000,
        description: 'Optimized for high-frequency, low-latency agent tasks.',
        contextLimit: '1M tokens',
        releaseDate: 'Feb. 5, 2025',
        knowledgeCutoff: 'Aug. 2024',
        standardRate: { inputPerMillionUsd: 0.075, outputPerMillionUsd: 0.3 },
    },
    {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        isFreeTier: true,
        inputCostPaid: '$1.25 (<=128K) / $2.50 (>128K)',
        outputCostPaid: '$5.00 (<=128K) / $10.00 (>128K)',
        rpmLimitFree: 2,
        rpdLimitFree: 50,
        tpmLimitFree: 32_000,
        description: 'Mid-size multimodal model optimized for a wide-range of reasoning tasks with up to 2M context.',
        contextLimit: '2M tokens',
        releaseDate: 'Feb. 15, 2024',
        knowledgeCutoff: 'Nov. 2023',
        standardRate: { inputPerMillionUsd: 1.25, outputPerMillionUsd: 5 },
        longContextRate: {
            promptThresholdTokens: 128_000,
            inputPerMillionUsd: 2.5,
            outputPerMillionUsd: 10,
        },
    },
    {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        isFreeTier: true,
        inputCostPaid: '$0.075 (<=128K) / $0.15 (>128K)',
        outputCostPaid: '$0.30 (<=128K) / $0.60 (>128K)',
        rpmLimitFree: 15,
        rpdLimitFree: 1500,
        tpmLimitFree: 1_000_000,
        description: 'Fast and versatile multimodal model for scaling across diverse tasks.',
        contextLimit: '1M tokens',
        releaseDate: 'May 14, 2024',
        knowledgeCutoff: 'Nov. 2023',
        standardRate: { inputPerMillionUsd: 0.075, outputPerMillionUsd: 0.3 },
        longContextRate: {
            promptThresholdTokens: 128_000,
            inputPerMillionUsd: 0.15,
            outputPerMillionUsd: 0.6,
        },
    },
    {
        id: 'gemini-1.5-flash-8b',
        name: 'Gemini 1.5 Flash-8B',
        isFreeTier: true,
        inputCostPaid: '$0.0375 (<=128K) / $0.075 (>128K)',
        outputCostPaid: '$0.15 (<=128K) / $0.30 (>128K)',
        rpmLimitFree: 15,
        rpdLimitFree: 1500,
        tpmLimitFree: 1_000_000,
        description: 'Smallest and most cost-effective model in the Gemini 1.5 family.',
        contextLimit: '1M tokens',
        releaseDate: 'Oct. 3, 2024',
        knowledgeCutoff: 'Nov. 2023',
        standardRate: { inputPerMillionUsd: 0.0375, outputPerMillionUsd: 0.15 },
        longContextRate: {
            promptThresholdTokens: 128_000,
            inputPerMillionUsd: 0.075,
            outputPerMillionUsd: 0.3,
        },
    },
];

export const GEMINI_MODEL_ALIASES: Record<string, string> = {
    'gemini-flash-latest': 'gemini-3.7-flash',
    'gemini-flash-lite-latest': 'gemini-3.5-flash-lite',
    'gemini-pro-latest': 'gemini-3.1-pro-preview',
};

const aliasModel = (
    id: string,
    targetId: string,
    name: string,
    description: string
): GeminiModelInfo => {
    const target = GEMINI_MODELS.find((model) => model.id === targetId);
    if (!target) throw new Error(`Missing Gemini model catalog entry: ${targetId}`);
    return { ...target, id, name, description };
};

export const EVALUATOR_MODELS: GeminiModelInfo[] = [
    ...GEMINI_MODELS,
    aliasModel(
        'gemini-flash-latest',
        'gemini-3.7-flash',
        'Gemini Flash Latest (Alias to 3.7 Flash)',
        'Alias that currently resolves to Gemini 3.7 Flash.'
    ),
    aliasModel(
        'gemini-flash-lite-latest',
        'gemini-3.5-flash-lite',
        'Gemini Flash-Lite Latest (Alias to 3.5 Flash-Lite)',
        'Alias that currently resolves to Gemini 3.5 Flash-Lite.'
    ),
    aliasModel(
        'gemini-pro-latest',
        'gemini-3.1-pro-preview',
        'Gemini Pro Latest (Alias to 3.1 Pro Preview)',
        'Alias that currently resolves to Gemini 3.1 Pro Preview.'
    ),
];

const mergeDiscovered = <T>(
    baseItems: T[],
    getId: (item: T) => string,
    discovered?: GeminiModelInfo[],
    transformDiscovered?: (model: GeminiModelInfo) => T
): T[] => {
    if (!discovered || discovered.length === 0) return baseItems;
    const existingIds = new Set(baseItems.map(getId));
    const extra: T[] = [];
    for (const model of discovered) {
        if (!existingIds.has(model.id)) {
            existingIds.add(model.id);
            extra.push(transformDiscovered ? transformDiscovered(model) : (model as unknown as T));
        }
    }
    return [...baseItems, ...extra];
};

export const getCombinedGeminiModels = (discovered?: GeminiModelInfo[]): GeminiModelInfo[] =>
    mergeDiscovered(GEMINI_MODELS, (m) => m.id, discovered);

export const getCombinedEvaluatorModels = (discovered?: GeminiModelInfo[]): GeminiModelInfo[] =>
    mergeDiscovered(EVALUATOR_MODELS, (m) => m.id, discovered);

export const getCombinedSuggestedTargetModels = (discovered?: GeminiModelInfo[]): string[] =>
    mergeDiscovered(
        GEMINI_MODELS.map((m) => m.id),
        (id) => id,
        discovered,
        (m) => m.id
    );


