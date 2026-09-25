import { GeminiUsageMeasurement, LiteLlmModelInfo } from '../types';

export const DEFAULT_LITELLM_BASE_URL = 'https://llm.potencial.tec.br';
export const DEFAULT_LITELLM_TIMEOUT_MS = 120_000;

export interface LiteLlmChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LiteLlmUsageMetadata {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_tokens_details?: {
        cached_tokens?: number;
    };
    completion_tokens_details?: {
        reasoning_tokens?: number;
    };
}

export interface LiteLlmChoice {
    index?: number;
    message?: {
        role?: string;
        content?: string | null;
    };
    finish_reason?: string;
}

export interface LiteLlmResponseEnvelope {
    id?: string;
    object?: string;
    created?: number;
    model?: string;
    choices?: LiteLlmChoice[];
    usage?: LiteLlmUsageMetadata;
    error?: {
        message?: string;
        type?: string;
        param?: string;
        code?: string | number;
    };
}

export interface LiteLlmRequestResult {
    url: string;
    status: number;
    duration: number;
    ok: boolean;
    body: unknown;
    text?: string;
}

export interface LiteLlmRequestOptions {
    baseUrl?: string;
    apiKey: string;
    model: string;
    messages: LiteLlmChatMessage[];
    responseFormat?: { type: 'json_object' };
    temperature?: number;
    signal?: AbortSignal;
    timeoutMs?: number;
    onUsage?: (usage: GeminiUsageMeasurement) => void;
}

export const normalizeLiteLlmBaseUrl = (rawUrl?: string): string => {
    const trimmed = (rawUrl || '').trim();
    if (!trimmed) return DEFAULT_LITELLM_BASE_URL;
    return trimmed.replace(/\/+$/, '');
};

export const buildLiteLlmChatCompletionsUrl = (baseUrl?: string): string => {
    const clean = normalizeLiteLlmBaseUrl(baseUrl);
    if (clean.endsWith('/v1')) {
        return `${clean}/chat/completions`;
    }
    return `${clean}/v1/chat/completions`;
};

export const buildLiteLlmModelsUrl = (baseUrl?: string): string => {
    const clean = normalizeLiteLlmBaseUrl(baseUrl);
    if (clean.endsWith('/v1')) {
        return `${clean}/models`;
    }
    return `${clean}/v1/models`;
};

export const parseLiteLlmResponseBody = (rawBody: string): unknown => {
    try {
        return rawBody ? JSON.parse(rawBody) : null;
    } catch {
        return rawBody;
    }
};

export const extractLiteLlmText = (body: unknown): string | undefined => {
    if (!body || typeof body !== 'object') return undefined;
    const envelope = body as LiteLlmResponseEnvelope;
    const content = envelope.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content : undefined;
};

export const getLiteLlmErrorMessage = (body: unknown): string => {
    if (!body) return 'Unknown LiteLLM Error';
    if (typeof body === 'string') return body;
    if (typeof body === 'object') {
        const envelope = body as LiteLlmResponseEnvelope;
        if (envelope.error?.message) {
            return envelope.error.message;
        }
        return JSON.stringify(body);
    }
    return String(body);
};

export const extractLiteLlmUsageMeasurement = (
    body: unknown,
    requestedModel: string
): GeminiUsageMeasurement | null => {
    if (!body || typeof body !== 'object') return null;
    const envelope = body as LiteLlmResponseEnvelope;
    const usage = envelope.usage;
    if (!usage) return null;

    const promptTokens = usage.prompt_tokens || 0;
    const candidateTokens = usage.completion_tokens || 0;
    const thinkingTokens = usage.completion_tokens_details?.reasoning_tokens || 0;
    const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0;
    const totalTokens = usage.total_tokens || (promptTokens + candidateTokens);

    return {
        requestedModel,
        resolvedModel: envelope.model || requestedModel,
        responseId: envelope.id,
        promptTokens,
        candidateTokens,
        thinkingTokens,
        cachedTokens,
        totalTokens,
    };
};

export const requestLiteLlmChatCompletion = async ({
    baseUrl,
    apiKey,
    model,
    messages,
    responseFormat,
    temperature = 0.3,
    signal,
    timeoutMs = DEFAULT_LITELLM_TIMEOUT_MS,
    onUsage,
}: LiteLlmRequestOptions): Promise<LiteLlmRequestResult> => {
    if (!apiKey?.trim()) {
        throw new Error('LiteLLM API Key is missing. Configure it in Settings > AI Configuration.');
    }

    const url = buildLiteLlmChatCompletionsUrl(baseUrl);
    const startedAt = Date.now();
    const requestController = new AbortController();
    const handleCallerAbort = () => requestController.abort(signal?.reason);

    if (signal?.aborted) handleCallerAbort();
    else signal?.addEventListener('abort', handleCallerAbort, { once: true });

    const timeoutId = globalThis.setTimeout(() => {
        requestController.abort(new DOMException('LiteLLM request timed out.', 'TimeoutError'));
    }, timeoutMs);

    const requestBody: Record<string, unknown> = {
        model: model.trim(),
        messages,
        temperature,
    };

    if (responseFormat) {
        requestBody.response_format = responseFormat;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.trim()}`,
            },
            body: JSON.stringify(requestBody),
            signal: requestController.signal,
        });

        const rawBody = await response.text();
        const body = parseLiteLlmResponseBody(rawBody);
        const text = extractLiteLlmText(body);
        const usage = extractLiteLlmUsageMeasurement(body, model);

        if (usage) {
            onUsage?.(usage);
        }

        return {
            url,
            status: response.status,
            duration: Date.now() - startedAt,
            ok: response.ok,
            body,
            text,
        };
    } finally {
        globalThis.clearTimeout(timeoutId);
        signal?.removeEventListener('abort', handleCallerAbort);
    }
};

export const fetchAvailableLiteLlmModels = async (
    baseUrl?: string,
    apiKey?: string,
    signal?: AbortSignal,
    timeoutMs = 20_000
): Promise<LiteLlmModelInfo[]> => {
    if (!apiKey?.trim()) {
        throw new Error('LiteLLM API Key is required to list available models.');
    }

    const url = buildLiteLlmModelsUrl(baseUrl);
    const requestController = new AbortController();
    const handleCallerAbort = () => requestController.abort(signal?.reason);

    if (signal?.aborted) handleCallerAbort();
    else signal?.addEventListener('abort', handleCallerAbort, { once: true });

    const timeoutId = globalThis.setTimeout(() => {
        requestController.abort(new DOMException('LiteLLM ListModels request timed out.', 'TimeoutError'));
    }, timeoutMs);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.trim()}`,
            },
            signal: requestController.signal,
        });

        if (!response.ok) {
            const raw = await response.text();
            const parsed = parseLiteLlmResponseBody(raw);
            throw new Error(
                `Failed to list LiteLLM models (${response.status}): ${getLiteLlmErrorMessage(parsed)}`
            );
        }

        const data = (await response.json()) as {
            data?: Array<{ id?: string; owned_by?: string }>;
            models?: Array<string | { id?: string; name?: string }>;
        };

        const rawList = Array.isArray(data.data)
            ? data.data
            : Array.isArray(data.models)
              ? data.models.map((m) => (typeof m === 'string' ? { id: m } : m))
              : [];

        const models: LiteLlmModelInfo[] = [];
        const seenIds = new Set<string>();

        for (const item of rawList) {
            const id = (item.id || '').trim();
            if (id && !seenIds.has(id)) {
                seenIds.add(id);
                models.push({
                    id,
                    name: id,
                    ownedBy: 'owned_by' in item ? (item as { owned_by?: string }).owned_by : undefined,
                });
            }
        }

        // Sort alphabetically by ID
        models.sort((a, b) => a.id.localeCompare(b.id));

        return models;
    } finally {
        globalThis.clearTimeout(timeoutId);
        signal?.removeEventListener('abort', handleCallerAbort);
    }
};

export const testLiteLlmConnection = async (
    baseUrl?: string,
    apiKey?: string
): Promise<{ ok: boolean; message: string; modelCount: number; models: LiteLlmModelInfo[] }> => {
    try {
        const models = await fetchAvailableLiteLlmModels(baseUrl, apiKey);
        return {
            ok: true,
            message: `Conexão estabelecida com sucesso! ${models.length} modelo(s) encontrado(s).`,
            modelCount: models.length,
            models,
        };
    } catch (err) {
        return {
            ok: false,
            message: err instanceof Error ? err.message : String(err),
            modelCount: 0,
            models: [],
        };
    }
};
