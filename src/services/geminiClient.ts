import { GeminiModelInfo, GEMINI_MODELS } from '../config/geminiModels';
import { GeminiUsageMeasurement } from '../types';

export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiUsageMetadataEnvelope {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    cachedContentTokenCount?: number;
    totalTokenCount?: number;
}

interface GeminiResponseEnvelope {
    candidates?: Array<{
        content?: {
            parts?: Array<{ text?: string }>;
        };
    }>;
    usageMetadata?: GeminiUsageMetadataEnvelope;
    modelVersion?: string;
    responseId?: string;
}

export interface GeminiRequestResult {
    url: string;
    status: number;
    duration: number;
    ok: boolean;
    body: unknown;
}

interface GeminiRequestOptions {
    apiKey: string;
    model: string;
    requestBody: Record<string, unknown>;
    signal?: AbortSignal;
    timeoutMs?: number;
    onUsage?: (usage: GeminiUsageMeasurement) => void;
}

const DEFAULT_GEMINI_TIMEOUT_MS = 120_000;

export const buildGeminiApiUrl = (model: string) =>
    `${GEMINI_API_BASE_URL}/${model}:generateContent`;

export const parseGeminiResponseBody = (rawBody: string): unknown => {
    try {
        return rawBody ? JSON.parse(rawBody) : null;
    } catch {
        return rawBody;
    }
};

export const extractGeminiText = (body: unknown): string | undefined => {
    if (!body || typeof body !== 'object') return undefined;
    return (body as GeminiResponseEnvelope).candidates?.[0]?.content?.parts?.[0]?.text;
};

export const getGeminiErrorBody = (body: unknown) =>
    typeof body === 'string' ? body : JSON.stringify(body);

const extractUsageMeasurement = (
    body: unknown,
    requestedModel: string
): GeminiUsageMeasurement | null => {
    if (!body || typeof body !== 'object') return null;
    const envelope = body as GeminiResponseEnvelope;
    if (!envelope.usageMetadata) return null;
    const usage = envelope.usageMetadata;

    return {
        requestedModel,
        resolvedModel: envelope.modelVersion || requestedModel,
        responseId: envelope.responseId,
        promptTokens: usage.promptTokenCount || 0,
        candidateTokens: usage.candidatesTokenCount || 0,
        thinkingTokens: usage.thoughtsTokenCount || 0,
        cachedTokens: usage.cachedContentTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
    };
};

export const requestGeminiGenerateContent = async ({
    apiKey,
    model,
    requestBody,
    signal,
    timeoutMs = DEFAULT_GEMINI_TIMEOUT_MS,
    onUsage,
}: GeminiRequestOptions): Promise<GeminiRequestResult> => {
    const url = buildGeminiApiUrl(model);
    const startedAt = Date.now();
    const requestController = new AbortController();
    const handleCallerAbort = () => requestController.abort(signal?.reason);
    if (signal?.aborted) handleCallerAbort();
    else signal?.addEventListener('abort', handleCallerAbort, { once: true });
    const timeoutId = globalThis.setTimeout(() => {
        requestController.abort(new DOMException('Gemini request timed out.', 'TimeoutError'));
    }, timeoutMs);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
            },
            body: JSON.stringify(requestBody),
            signal: requestController.signal,
        });
        const rawBody = await response.text();
        const body = parseGeminiResponseBody(rawBody);
        const usage = extractUsageMeasurement(body, model);
        if (usage) onUsage?.(usage);

        return {
            url,
            status: response.status,
            duration: Date.now() - startedAt,
            ok: response.ok,
            body,
        };
    } finally {
        globalThis.clearTimeout(timeoutId);
        signal?.removeEventListener('abort', handleCallerAbort);
    }
};

interface GeminiApiListedModel {
    name: string;
    version?: string;
    displayName?: string;
    description?: string;
    inputTokenLimit?: number;
    outputTokenLimit?: number;
    supportedGenerationMethods?: string[];
    temperature?: number;
    topP?: number;
    topK?: number;
}

interface GeminiListModelsResponse {
    models?: GeminiApiListedModel[];
    nextPageToken?: string;
}

const formatTokenLimit = (limit?: number): string => {
    if (!limit) return '1M tokens';
    if (limit >= 1_000_000) {
        const millions = limit / 1_000_000;
        return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M tokens`;
    }
    if (limit >= 1_000) {
        const thousands = limit / 1_000;
        return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(0)}K tokens`;
    }
    return `${limit} tokens`;
};

export const fetchAvailableGeminiModels = async (
    apiKey: string,
    signal?: AbortSignal,
    timeoutMs = DEFAULT_GEMINI_TIMEOUT_MS
): Promise<GeminiModelInfo[]> => {
    if (!apiKey?.trim()) {
        throw new Error('API Key is required to fetch available Gemini models.');
    }

    const requestController = new AbortController();
    const handleCallerAbort = () => requestController.abort(signal?.reason);
    if (signal?.aborted) handleCallerAbort();
    else signal?.addEventListener('abort', handleCallerAbort, { once: true });
    const timeoutId = globalThis.setTimeout(() => {
        requestController.abort(
            new DOMException('Gemini ListModels request timed out.', 'TimeoutError')
        );
    }, timeoutMs);

    const accumulatedRawModels: GeminiApiListedModel[] = [];

    try {
        let nextPageToken: string | undefined = undefined;

        do {
            const params = new URLSearchParams({ pageSize: '100' });
            if (nextPageToken) {
                params.set('pageToken', nextPageToken);
            }

            const url = `${GEMINI_API_BASE_URL}?${params.toString()}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey.trim(),
                },
                signal: requestController.signal,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Failed to list Gemini models (${response.status}): ${errorText}`
                );
            }

            const data = (await response.json()) as GeminiListModelsResponse;
            if (data.models && Array.isArray(data.models)) {
                accumulatedRawModels.push(...data.models);
            }
            nextPageToken = data.nextPageToken;
        } while (nextPageToken);
    } finally {
        globalThis.clearTimeout(timeoutId);
        signal?.removeEventListener('abort', handleCallerAbort);
    }

    // Filter only models that support text/content generation
    const contentModels = accumulatedRawModels.filter((m) =>
        m.supportedGenerationMethods?.includes('generateContent')
    );

    const staticModelsMap = new Map<string, GeminiModelInfo>(
        GEMINI_MODELS.map((m) => [m.id, m])
    );

    const result: GeminiModelInfo[] = [];

    for (const raw of contentModels) {
        const cleanId = (raw.name || '').replace(/^models\//, '').trim();
        if (!cleanId) continue;

        const known = staticModelsMap.get(cleanId);
        if (known) {
            result.push({
                ...known,
                description: raw.description || known.description,
            });
        } else {
            result.push({
                id: cleanId,
                name: raw.displayName ? `${raw.displayName} (${cleanId})` : cleanId,
                isFreeTier: true,
                inputCostPaid: 'Custom/Dynamic',
                outputCostPaid: 'Custom/Dynamic',
                description:
                    raw.description ||
                    'Model discovered dynamically via Google AI Studio API.',
                contextLimit: formatTokenLimit(raw.inputTokenLimit),
                standardRate: { inputPerMillionUsd: 0, outputPerMillionUsd: 0 },
            });
        }
    }

    return result;
};


