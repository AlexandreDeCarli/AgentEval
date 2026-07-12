import {
    GEMINI_MODEL_ALIASES,
    GEMINI_MODELS,
    GEMINI_PRICING_DATE,
    GEMINI_PRICING_SOURCE,
    GEMINI_PRICING_VERSION,
} from '../config/geminiModels';
import {
    AiPricingSnapshot,
    AiPricingStatus,
    AiUsageContext,
    AiUsageEvent,
    GeminiUsageMeasurement,
} from '../types';

interface AiUsageCostResult {
    status: AiPricingStatus;
    outputTokens: number;
    inputCostUsd: number | null;
    outputCostUsd: number | null;
    totalCostUsd: number | null;
    snapshot: AiPricingSnapshot | null;
}

const modelIdsBySpecificity = GEMINI_MODELS
    .map((model) => model.id)
    .sort((left, right) => right.length - left.length);

export const normalizeGeminiModelId = (model: string): string => {
    const withoutPrefix = model.trim().replace(/^models\//, '');
    const alias = GEMINI_MODEL_ALIASES[withoutPrefix];
    if (alias) return alias;

    return (
        modelIdsBySpecificity.find(
            (knownId) => withoutPrefix === knownId || withoutPrefix.startsWith(`${knownId}-`)
        ) || withoutPrefix
    );
};

export const calculateAiUsageCost = (
    measurement: GeminiUsageMeasurement
): AiUsageCostResult => {
    const outputTokens = measurement.candidateTokens + measurement.thinkingTokens;
    if (measurement.cachedTokens > 0) {
        return {
            status: 'unpriced_cache',
            outputTokens,
            inputCostUsd: null,
            outputCostUsd: null,
            totalCostUsd: null,
            snapshot: null,
        };
    }

    const normalizedModel = normalizeGeminiModelId(
        measurement.resolvedModel || measurement.requestedModel
    );
    const model = GEMINI_MODELS.find((candidate) => candidate.id === normalizedModel);
    if (!model) {
        return {
            status: 'unpriced',
            outputTokens,
            inputCostUsd: null,
            outputCostUsd: null,
            totalCostUsd: null,
            snapshot: null,
        };
    }

    const longContextRate = model.longContextRate;
    const rate =
        longContextRate && measurement.promptTokens > longContextRate.promptThresholdTokens
            ? longContextRate
            : model.standardRate;
    const inputCostUsd = (measurement.promptTokens / 1_000_000) * rate.inputPerMillionUsd;
    const outputCostUsd = (outputTokens / 1_000_000) * rate.outputPerMillionUsd;
    const snapshot: AiPricingSnapshot = {
        pricingVersion: GEMINI_PRICING_VERSION,
        pricingDate: GEMINI_PRICING_DATE,
        currency: 'USD',
        inputPerMillionUsd: rate.inputPerMillionUsd,
        outputPerMillionUsd: rate.outputPerMillionUsd,
        source: GEMINI_PRICING_SOURCE,
        ...(longContextRate
            ? { promptThresholdTokens: longContextRate.promptThresholdTokens }
            : {}),
    };

    return {
        status: 'priced',
        outputTokens,
        inputCostUsd,
        outputCostUsd,
        totalCostUsd: inputCostUsd + outputCostUsd,
        snapshot,
    };
};

export const createAiUsageEvent = (
    context: AiUsageContext,
    measurement: GeminiUsageMeasurement,
    occurredAt = Date.now()
): AiUsageEvent => {
    const cost = calculateAiUsageCost(measurement);

    return {
        id: crypto.randomUUID(),
        occurredAt,
        ...context,
        requestedModel: measurement.requestedModel,
        resolvedModel: measurement.resolvedModel || measurement.requestedModel,
        responseId: measurement.responseId,
        inputTokens: measurement.promptTokens,
        candidateTokens: measurement.candidateTokens,
        thinkingTokens: measurement.thinkingTokens,
        outputTokens: cost.outputTokens,
        cachedInputTokens: measurement.cachedTokens,
        totalTokens: measurement.totalTokens,
        pricingStatus: cost.status,
        estimatedInputCostUsd: cost.inputCostUsd,
        estimatedOutputCostUsd: cost.outputCostUsd,
        estimatedCostUsd: cost.totalCostUsd,
        pricingSnapshot: cost.snapshot,
    };
};
