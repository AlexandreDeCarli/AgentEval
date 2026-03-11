// templateEngine.ts

export const resolveVariables = (variables: Record<string, any[]>): Record<string, any> => {
    const resolved: Record<string, any> = {};
    for (const [key, values] of Object.entries(variables)) {
        if (Array.isArray(values) && values.length > 0) {
            const randomIndex = Math.floor(Math.random() * values.length);
            resolved[key] = values[randomIndex];
        } else {
            resolved[key] = null;
        }
    }
    return resolved;
};

export const applyVariables = (text: string, resolved: Record<string, any>): string => {
    let result = text;
    for (const [key, value] of Object.entries(resolved)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, String(value));
    }
    return result;
};

export const injectMessage = (template: string, message: string): string => {
    // We need to safely stringify the message so it fits inside JSON
    const safeMessage = JSON.stringify(message).slice(1, -1); // Remove outer quotes
    let result = template.replace(new RegExp('{{message}}', 'g'), safeMessage);
    result = result.replace(new RegExp('{{wamid}}', 'g'), Math.random().toString(36).substring(2, 10));
    result = result.replace(new RegExp('{{timestamp}}', 'g'), Math.floor(Date.now() / 1000).toString());
    return result;
};
