export const resolveVariables = (
    variables: Record<string, unknown[]>
): Record<string, unknown> => {
    const resolved: Record<string, unknown> = {};
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

export const applyVariables = (
    text: string | undefined | null,
    resolved: Record<string, unknown>
): string => {
    if (!text) return '';
    let result = text;
    for (const [key, value] of Object.entries(resolved)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        const replacement = value === null || value === undefined ? '' : String(value);
        result = result.replace(regex, replacement);
    }
    // Defensive fallbacks for channel placeholders (WhatsApp/phone/contact) if omitted in variables
    if (result.includes('{{phone_number}}')) {
        result = result.replace(/{{phone_number}}/g, '5546988087783');
    }
    if (result.includes('{{contact_name}}')) {
        result = result.replace(/{{contact_name}}/g, 'Alexandre de Carli');
    }
    return result;
};

export const injectMessage = (template: string | undefined | null, message: string): string => {
    if (!template) return message;
    // We need to safely stringify the message so it fits inside JSON
    const safeMessage = JSON.stringify(message).slice(1, -1); // Remove outer quotes
    let result = template.replace(new RegExp('{{message}}', 'g'), safeMessage);
    result = result.replace(new RegExp('{{wamid}}', 'g'), 'wamid.' + Math.random().toString(36).substring(2, 12));
    result = result.replace(new RegExp('{{entry_id}}', 'g'), Math.random().toString(36).substring(2, 14));
    result = result.replace(new RegExp('{{timestamp}}', 'g'), Math.floor(Date.now() / 1000).toString());
    // Defensive fallbacks for channel placeholders
    result = result.replace(new RegExp('{{phone_number}}', 'g'), '5546988087783');
    result = result.replace(new RegExp('{{contact_name}}', 'g'), 'Alexandre de Carli');
    return result;
};
