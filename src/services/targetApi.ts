import { ApiConfig, DebugLogEntry } from '../types';
import { injectMessage } from '../utils/templateEngine';

export type { DebugLogEntry };

type UnknownRecord = Record<string, unknown>;
type TargetItem = UnknownRecord & {
    id?: unknown;
    role?: unknown;
    content?: unknown;
    parts?: unknown;
    data?: unknown;
    messages?: unknown;
    contentStatus?: unknown;
};

type TargetMessageCallback = (
    msgId: string,
    content: string,
    status: string,
    structuredContent?: string
) => void;

const STRUCTURED_OUTPUT_KEYS = [
    'userResponse',
    'functionToExecute',
    'functionName',
    'function_call',
    'functionCall',
    'toolCall',
    'tool_calls',
    'toolCalls',
    'functionResult',
    'extractedData',
];

const isRecord = (value: unknown): value is UnknownRecord =>
    typeof value === 'object' && value !== null;

const toTargetItemArray = (value: unknown): TargetItem[] => {
    if (!Array.isArray(value)) return [];
    return value.filter(isRecord) as TargetItem[];
};

const getNestedValue = (obj: unknown, path: string): unknown => {
    if (!path || obj === null || obj === undefined) return obj;

    return path.split('.').reduce<unknown>((acc, part) => {
        if (Array.isArray(acc)) {
            const index = Number(part);
            if (Number.isInteger(index)) {
                return acc[index];
            }
            return Reflect.get(acc, part);
        }

        if (isRecord(acc) && acc[part] !== undefined) {
            return acc[part];
        }

        return undefined;
    }, obj);
};

const parseJsonString = (value: string): unknown => {
    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
};

const extractGeminiPartsText = (value: unknown): string | undefined => {
    if (!isRecord(value)) return undefined;
    const parts = value.parts;
    if (!Array.isArray(parts) || !isRecord(parts[0])) return undefined;
    const text = parts[0].text;
    return typeof text === 'string' ? text : undefined;
};

const extractUserResponse = (value: unknown): string | undefined => {
    if (!isRecord(value)) return undefined;

    const userResponse = value.userResponse;
    if (typeof userResponse === 'string' && userResponse !== '') {
        return userResponse;
    }

    const functionResult = value.functionResult;
    if (!isRecord(functionResult)) return undefined;
    const data = functionResult.data;
    return typeof data === 'string' ? data : undefined;
};

const getStructuredContent = (value: unknown): string | undefined => {
    if (!isRecord(value)) return undefined;
    if (!STRUCTURED_OUTPUT_KEYS.some((key) => key in value)) return undefined;
    return JSON.stringify(value);
};

const getSortableId = (value: unknown): number | null => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

const normalizeItems = (data: unknown, path?: string): TargetItem[] => {
    if (!data) return [];

    let extracted: unknown = data;
    if (path) {
        extracted = getNestedValue(data, path);
    }

    if (Array.isArray(extracted)) return toTargetItemArray(extracted);

    if (isRecord(extracted)) {
        if (Array.isArray(extracted.messages)) return toTargetItemArray(extracted.messages);
        if (Array.isArray(extracted.data)) return toTargetItemArray(extracted.data);
        if (extracted.role || extracted.content || extracted.parts) {
            return [extracted];
        }
    }

    return [];
};

export const sendTargetMessage = async (
    apiConfig: ApiConfig,
    testerMessage: string,
    signal?: AbortSignal,
    onDebugLog?: (entry: DebugLogEntry) => void
): Promise<void> => {
    const payloadStr = injectMessage(apiConfig.payload_template, testerMessage);
    let payload: unknown;
    try {
        payload = JSON.parse(payloadStr);
    } catch {
        throw new Error('Invalid JSON payload after template injection:\n' + payloadStr);
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (apiConfig.auth_header) {
        headers['Authorization'] = apiConfig.auth_header;
    }

    const t0 = Date.now();
    const response = await fetch(apiConfig.post_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal,
    });

    const duration = Date.now() - t0;
    let responseBody: unknown = null;
    try {
        const text = await response.clone().text();
        responseBody = parseJsonString(text) ?? text;
    } catch {
        responseBody = null;
    }

    onDebugLog?.({
        id: crypto.randomUUID(),
        timestamp: t0,
        type: 'POST',
        url: apiConfig.post_url,
        status: response.status,
        duration,
        requestBody: payload,
        response: responseBody,
    });

    if (!response.ok) {
        const errText = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
        throw new Error(`Target API POST Error (${response.status}): ${errText}`);
    }
};

export const fetchPreStateIds = async (
    apiConfig: ApiConfig,
    signal?: AbortSignal
): Promise<Set<unknown>> => {
    try {
        const headers: Record<string, string> = {};
        if (apiConfig.auth_header) {
            headers['Authorization'] = apiConfig.auth_header;
        }
        const response = await fetch(apiConfig.get_url, {
            method: 'GET',
            headers,
            signal,
        });
        if (!response.ok) return new Set();
        const data: unknown = await response.json();

        const ids = new Set<unknown>();
        const items = normalizeItems(data, apiConfig.response_path);

        items.forEach((item) => {
            if (item.id !== undefined) ids.add(item.id);
            else ids.add(JSON.stringify(item));
        });
        return ids;
    } catch {
        return new Set();
    }
};

export const pollTargetResponse = async (
    apiConfig: ApiConfig,
    preStateIds: Set<unknown>,
    onMessage: TargetMessageCallback,
    signal?: AbortSignal,
    onDebugLog?: (entry: DebugLogEntry) => void
): Promise<void> => {
    const startTime = Date.now();
    const timeoutMs = apiConfig.max_timeout * 1000;

    const headers: Record<string, string> = {};
    if (apiConfig.auth_header) {
        headers['Authorization'] = apiConfig.auth_header;
    }

    const knownStatus = new Map<unknown, string>();

    while (Date.now() - startTime < timeoutMs) {
        if (signal?.aborted) throw new Error('Polling aborted');

        try {
            const t0 = Date.now();
            const response = await fetch(apiConfig.get_url, {
                method: 'GET',
                headers,
                signal,
            });

            const duration = Date.now() - t0;

            if (!response.ok) {
                throw new Error(`Target API GET Error (${response.status})`);
            }

            const data: unknown = await response.json();

            onDebugLog?.({
                id: crypto.randomUUID(),
                timestamp: t0,
                type: 'GET',
                url: apiConfig.get_url,
                status: response.status,
                duration,
                response: data,
            });

            const items = normalizeItems(data, apiConfig.response_path);

            // Only consider target/model messages
            const targetItems = items.filter(
                (item) => item.role === 'model' || item.role === 'target'
            );

            // Turn is complete when no MODEL/TARGET message is still processing
            // (user messages may stay 'processing' after the model replies — ignore them)
            const anyStillProcessing = targetItems.some(
                (item) => item.contentStatus === 'processing'
            );
            targetItems.sort((a, b) => {
                const aId = getSortableId(a.id);
                const bId = getSortableId(b.id);
                if (aId === null || bId === null) return 0;
                return aId - bId;
            });

            for (const item of targetItems) {
                const itemKey = item.id !== undefined ? item.id : JSON.stringify(item);

                // Skip messages that existed before this turn
                if (preStateIds.has(itemKey) && !knownStatus.has(itemKey)) {
                    continue;
                }

                let extracted: unknown =
                    typeof item.content === 'string' ? item.content : item.content ?? item;
                let structuredContent: string | undefined;

                if (typeof extracted !== 'string') {
                    structuredContent = JSON.stringify(extracted);
                }

                // Unwrap: {"role":"model","parts":[{"text":"..."}]}
                if (typeof extracted === 'string') {
                    const parsed = parseJsonString(extracted);
                    const partsText = extractGeminiPartsText(parsed);
                    if (partsText) {
                        extracted = partsText;
                    }
                }

                // Unwrap: {"userResponse":"...","functionToExecute":"..."}
                if (typeof extracted === 'string') {
                    const innerJson = parseJsonString(extracted);
                    const userResponse = extractUserResponse(innerJson);
                    structuredContent = getStructuredContent(innerJson) ?? structuredContent;
                    if (userResponse) {
                        extracted = userResponse;
                    }
                }

                const finalStr = typeof extracted === 'string' ? extracted : JSON.stringify(extracted);
                const statusToReport = anyStillProcessing ? 'processing' : 'processed';

                const lastStatus = knownStatus.get(itemKey);
                if (lastStatus !== statusToReport || lastStatus === undefined) {
                    knownStatus.set(itemKey, statusToReport);
                    onMessage(String(itemKey), finalStr, statusToReport, structuredContent);
                }
            }

            // Turn complete: at least one new model message and nothing still processing
            if (knownStatus.size > 0 && !anyStillProcessing) {
                return;
            }

        } catch (error) {
            if (error instanceof Error && error.message === 'Polling aborted') throw error;
            console.warn(
                'Polling error:',
                error instanceof Error ? error.message : String(error)
            );
        }

        await new Promise((resolve) => setTimeout(resolve, apiConfig.polling_interval));
    }

    throw new Error(`Polling timeout after ${apiConfig.max_timeout} seconds`);
};
