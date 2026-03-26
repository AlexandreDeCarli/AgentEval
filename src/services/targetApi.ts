import { ApiConfig, DebugLogEntry } from '../types';
import { injectMessage } from '../utils/templateEngine';

export type { DebugLogEntry };

const getNestedValue = (obj: any, path: string) => {
    if (!path || !obj) return obj;
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : undefined, obj);
};

const normalizeItems = (data: any, path?: string): any[] => {
    if (!data) return [];

    let extracted = data;
    if (path) {
        extracted = getNestedValue(data, path);
    }

    if (Array.isArray(extracted)) return extracted;

    if (extracted && typeof extracted === 'object') {
        if (extracted.messages && Array.isArray(extracted.messages)) return extracted.messages;
        if (extracted.data && Array.isArray(extracted.data)) return extracted.data;
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
    let payload;
    try {
        payload = JSON.parse(payloadStr);
    } catch (e) {
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
    let responseBody: any = null;
    try {
        const text = await response.clone().text();
        try { responseBody = JSON.parse(text); } catch { responseBody = text; }
    } catch { /* ignore */ }

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

export const fetchPreStateIds = async (apiConfig: ApiConfig, signal?: AbortSignal): Promise<Set<any>> => {
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
        const data = await response.json();

        const ids = new Set<any>();
        const items = normalizeItems(data, apiConfig.response_path);

        items.forEach((item: any) => {
            if (item.id !== undefined) ids.add(item.id);
            else ids.add(JSON.stringify(item));
        });
        return ids;
    } catch (e) {
        return new Set();
    }
};

export const pollTargetResponse = async (
    apiConfig: ApiConfig,
    preStateIds: Set<any>,
    onMessage: (msgId: string, content: string, status: string) => void,
    signal?: AbortSignal,
    onDebugLog?: (entry: DebugLogEntry) => void
): Promise<void> => {
    const startTime = Date.now();
    const timeoutMs = apiConfig.max_timeout * 1000;

    const headers: Record<string, string> = {};
    if (apiConfig.auth_header) {
        headers['Authorization'] = apiConfig.auth_header;
    }

    const knownStatus = new Map<any, string>();

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

            const data = await response.json();

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
            const targetItems = items.filter((i: any) => i.role === 'model' || i.role === 'target');

            // Turn is complete when no MODEL/TARGET message is still processing
            // (user messages may stay 'processing' after the model replies — ignore them)
            const anyStillProcessing = targetItems.some(
                (i: any) => i.contentStatus === 'processing'
            );
            targetItems.sort((a: any, b: any) => (a.id && b.id ? a.id - b.id : 0));

            for (const item of targetItems) {
                const itemKey = item.id !== undefined ? item.id : JSON.stringify(item);

                // Skip messages that existed before this turn
                if (preStateIds.has(itemKey) && !knownStatus.has(itemKey)) {
                    continue;
                }

                let extracted = typeof item.content === 'string' ? item.content : JSON.stringify(item);

                // Unwrap: {"role":"model","parts":[{"text":"..."}]}
                try {
                    const parsed = JSON.parse(extracted);
                    if (parsed.parts && parsed.parts[0]?.text) {
                        extracted = parsed.parts[0].text;
                    }
                } catch (e) { }

                // Unwrap: {"userResponse":"...","functionToExecute":"..."}
                try {
                    if (typeof extracted === 'string') {
                        const innerJson = JSON.parse(extracted);
                        if (innerJson.userResponse && innerJson.userResponse !== '') {
                            extracted = innerJson.userResponse;
                        } else if (innerJson.functionResult?.data) {
                            extracted = innerJson.functionResult.data;
                        }
                    }
                } catch (e) { }

                const finalStr = typeof extracted === 'string' ? extracted : JSON.stringify(extracted);
                const statusToReport = anyStillProcessing ? 'processing' : 'processed';

                const lastStatus = knownStatus.get(itemKey);
                if (lastStatus !== statusToReport || lastStatus === undefined) {
                    knownStatus.set(itemKey, statusToReport);
                    onMessage(String(itemKey), finalStr, statusToReport);
                }
            }

            // Turn complete: at least one new model message and nothing still processing
            if (knownStatus.size > 0 && !anyStillProcessing) {
                return;
            }

        } catch (e: any) {
            if (e.message === 'Polling aborted') throw e;
            console.warn('Polling error:', e.message);
        }

        await new Promise((resolve) => setTimeout(resolve, apiConfig.polling_interval));
    }

    throw new Error(`Polling timeout after ${apiConfig.max_timeout} seconds`);
};
