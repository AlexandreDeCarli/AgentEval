type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject =>
    typeof value === 'object' && value !== null;

export const extractByPath = (data: unknown, pathStr: string): unknown => {
    if (!pathStr || !data) return undefined;

    // Split by dot but also handle array notation [index]
    // e.g., "messages[-1].content" -> ["messages", "-1", "content"]
    const parts = pathStr
        .split('[')
        .join('.')
        .split(']')
        .join('.')
        .split('.')
        .filter(Boolean);

    let current: unknown = data;
    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }

        if (Array.isArray(current)) {
            if (part === '-1') {
                current = current[current.length - 1];
            } else if (part.startsWith('?')) {
                const [filterKey, filterVal] = part.substring(1).split('=');
                current = current.filter(
                    (item): item is JsonObject =>
                        isJsonObject(item) && item[filterKey] === filterVal
                );
            } else {
                current = Reflect.get(current, part);
            }
        } else if (isJsonObject(current)) {
            current = current[part];
        } else {
            return undefined;
        }
    }

    return current;
};
