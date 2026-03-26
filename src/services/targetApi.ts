import { ApiConfig } from '../types';
import { injectMessage } from '../utils/templateEngine';

const getNestedValue = (obj: any, path: string) => {
    if (!path || !obj) return obj;
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : undefined, obj);
};

const normalizeItems = (data: any, path?: string): any[] => {
    if (!data) return [];
    
    // 1. Try path extraction if path is provided
    let extracted = data;
    if (path) {
        extracted = getNestedValue(data, path);
    }

    // 2. If it is already an array, use it
    if (Array.isArray(extracted)) return extracted;

    // 3. Fallback wrappers (only if no explicit path was used or if the extracted value is an object)
    if (extracted && typeof extracted === 'object') {
        // If it's a wrapper object with common message keys
        if (extracted.messages && Array.isArray(extracted.messages)) return extracted.messages;
        if (extracted.data && Array.isArray(extracted.data)) return extracted.data;
        
        // If the object itself looks like a message (Gemini style or standard)
        if (extracted.role || extracted.content || extracted.parts) {
            return [extracted];
        }
    }

    return [];
};

export const sendTargetMessage = async (
    apiConfig: ApiConfig,
    testerMessage: string,
    signal?: AbortSignal
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

    const response = await fetch(apiConfig.post_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal,
    });

    if (!response.ok) {
        const errText = await response.text();
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
    signal?: AbortSignal
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
            const response = await fetch(apiConfig.get_url, {
                method: 'GET',
                headers,
                signal,
            });

            if (!response.ok) {
                throw new Error(`Target API GET Error (${response.status})`);
            }

            const data = await response.json();
            const items = normalizeItems(data, apiConfig.response_path);

            // Check if ANY user message is still processing (this means the turn is not over)
            const anyUserProcessing = items.some((i: any) => i.role === 'user' && i.contentStatus === 'processing');

            // Only consider target messages
            const targetItems = items.filter((i: any) => i.role === 'model' || i.role === 'target');

            // Sort chronologically if they have IDs
            targetItems.sort((a: any, b: any) => (a.id && b.id ? a.id - b.id : 0));

            for (const item of targetItems) {
                const itemKey = item.id !== undefined ? item.id : JSON.stringify(item);

                if (!preStateIds.has(itemKey) || knownStatus.has(itemKey)) {
                    // preStateIds check avoids old turn messages. knownStatus.has check ensures we update
                    // messages that we already discovered in this same turn whose processing status might have changed.
                    if (preStateIds.has(itemKey) && !knownStatus.has(itemKey)) {
                        continue; // truly old message from previous turn, ignore
                    }

                    let extracted = typeof item.content === 'string' ? item.content : JSON.stringify(item);

                    try {
                        const parsed = JSON.parse(extracted);
                        if (parsed.parts && parsed.parts[0]?.text) {
                            extracted = parsed.parts[0].text;
                        }
                    } catch (e) { }

                    try {
                        if (typeof extracted === 'string') {
                            const innerJson = JSON.parse(extracted);
                            if (innerJson.userResponse && innerJson.userResponse !== '') {
                                extracted = innerJson.userResponse;
                            } else if (innerJson.functionResult && innerJson.functionResult.data) {
                                extracted = innerJson.functionResult.data;
                            }
                        }
                    } catch (e) { }

                        const finalStr = typeof extracted === 'string' ? extracted : JSON.stringify(extracted);

                        console.log(`[TARGET RESPONSE] MsgId: ${itemKey}, Content: ${finalStr.substring(0, 50)}${finalStr.length > 50 ? '...' : ''}`);

                        // The status to report to the UI depends on whether the overall turn is still processing
                    const statusToReport = anyUserProcessing ? 'processing' : 'processed';

                    const lastStatus = knownStatus.get(itemKey);
                    if (lastStatus !== statusToReport || lastStatus === undefined) {
                        knownStatus.set(itemKey, statusToReport);
                        onMessage(String(itemKey), finalStr, statusToReport);
                    }
                }
            }

            // Consider the turn complete if we have at least one message and the user message is no longer processing
            if (knownStatus.size > 0 && !anyUserProcessing) {
                return; // all target responses are final
            }

        } catch (e: any) {
            console.warn('Polling error:', e.message);
        }

        await new Promise((resolve) => setTimeout(resolve, apiConfig.polling_interval));
    }

    throw new Error(`Polling timeout after ${apiConfig.max_timeout} seconds`);
};
