export const GEMINI_PRICING_VERSION = 'gemini-standard-2026-07-10';
export const GEMINI_PRICING_DATE = '2026-07-10';
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
        id: 'gemini-3.5-flash',
        name: 'Gemini 3.5 Flash (Default)',
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
        id: 'gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro Preview',
        isFreeTier: false,
        inputCostPaid: '$2.00 (<=200K) / $4.00 (>200K)',
        outputCostPaid: '$12.00 (<=200K) / $18.00 (>200K)',
        description: 'Deep reasoning model for complex multimodal workflows.',
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
];

export const GEMINI_MODEL_ALIASES: Record<string, string> = {
    'gemini-flash-latest': 'gemini-3.5-flash',
    'gemini-flash-lite-latest': 'gemini-3.1-flash-lite',
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
        'gemini-3.5-flash',
        'Gemini Flash Latest (Alias to 3.5 Flash)',
        'Alias that currently resolves to Gemini 3.5 Flash.'
    ),
    aliasModel(
        'gemini-flash-lite-latest',
        'gemini-3.1-flash-lite',
        'Gemini Flash-Lite Latest (Alias to 3.1 Flash-Lite)',
        'Alias that currently resolves to Gemini 3.1 Flash-Lite.'
    ),
    aliasModel(
        'gemini-pro-latest',
        'gemini-3.1-pro-preview',
        'Gemini Pro Latest (Alias to 3.1 Pro Preview)',
        'Alias that currently resolves to Gemini 3.1 Pro Preview.'
    ),
];
