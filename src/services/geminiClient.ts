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
