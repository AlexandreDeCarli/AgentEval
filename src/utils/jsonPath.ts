// jsonPath.ts

export const extractByPath = (data: any, pathStr: string): any => {
    if (!pathStr || !data) return undefined;

    // Split by dot but also handle array notation [index]
    // e.g., "messages[-1].content" -> ["messages", "-1", "content"]
    const parts = pathStr
        .replace(/\[([^\[\]]*)\]/g, '.$1.')
        .split('.')
        .filter(Boolean);

    let current = data;
    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }

        if (Array.isArray(current)) {
            if (part === '-1') {
                current = current[current.length - 1];
            } else if (part.startsWith('?')) {
                const [filterKey, filterVal] = part.substring(1).split('=');
                current = current.filter((item: any) => item[filterKey] === filterVal);
            } else {
                current = (current as any)[part as any];
            }
        } else {
            current = current[part];
        }
    }

    return current;
};
