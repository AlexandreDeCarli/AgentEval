/**
 * Utility to reliably extract and parse JSON from LLM responses.
 * Handles markdown fences, <think> reasoning tags, unescaped newlines, trailing commas,
 * smart quotes, and conversational text wrapping.
 */

export interface ParseLlmJsonOptions<T> {
    fallbackExtract?: (cleanedText: string, rawText: string) => T | null;
    errorContext?: string;
    provider?: 'gemini' | 'litellm';
}

export const sanitizeJsonString = (str: string): string => {
    // Replace smart/curly quotes
    let result = str.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

    // Remove trailing commas before } or ]
    result = result.replace(/,\s*([}\]])/g, '$1');

    // Fix unescaped control characters inside string literals (e.g. raw newlines or tabs)
    let inString = false;
    let escaped = false;
    let out = '';

    for (let i = 0; i < result.length; i++) {
        const char = result[i];

        if (char === '"' && !escaped) {
            inString = !inString;
            out += char;
        } else if (inString) {
            if (char === '\\') {
                escaped = !escaped;
                out += char;
            } else {
                if (char === '\n') {
                    out += '\\n';
                } else if (char === '\r') {
                    // skip carriage returns inside strings
                } else if (char === '\t') {
                    out += '\\t';
                } else {
                    out += char;
                }
                escaped = false;
            }
        } else {
            out += char;
            escaped = false;
        }
    }

    return out;
};

export const extractLlmJson = <T = unknown>(
    rawText: string,
    options?: ParseLlmJsonOptions<T>
): T => {
    if (!rawText || typeof rawText !== 'string') {
        const ctx = options?.errorContext ? ` (${options.errorContext})` : '';
        throw new Error(`Empty response from LLM${ctx}`);
    }

    // 1. Strip thinking / reasoning tags (DeepSeek R1, Qwen reasoning, etc.)
    const cleaned = rawText
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
        .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
        .trim();

    // 2. Candidate strings to try parsing
    const candidates: string[] = [];

    // Check for markdown code blocks (```json ... ``` or ``` ... ```) anywhere in text
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
    let match: RegExpExecArray | null;
    while ((match = codeBlockRegex.exec(cleaned)) !== null) {
        if (match[1]?.trim()) {
            candidates.push(match[1].trim());
        }
    }

    // Prioritize cleaned directly if it starts with { or [
    if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
        candidates.push(cleaned);
    }

    // Determine whether array [ or object { appears first in cleaned text
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');

    const isArrayFirst = firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace);

    if (isArrayFirst) {
        if (firstBracket !== -1 && lastBracket > firstBracket) {
            candidates.push(cleaned.slice(firstBracket, lastBracket + 1).trim());
        }
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            candidates.push(cleaned.slice(firstBrace, lastBrace + 1).trim());
        }
    } else {
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            candidates.push(cleaned.slice(firstBrace, lastBrace + 1).trim());
        }
        if (firstBracket !== -1 && lastBracket > firstBracket) {
            candidates.push(cleaned.slice(firstBracket, lastBracket + 1).trim());
        }
    }

    if (!candidates.includes(cleaned)) {
        candidates.push(cleaned);
    }

    // Try parsing candidates: first direct, then sanitized
    for (const candidate of candidates) {
        try {
            return JSON.parse(candidate) as T;
        } catch {
            // direct failed, try sanitization
        }

        try {
            return JSON.parse(sanitizeJsonString(candidate)) as T;
        } catch {
            // continue to next candidate
        }
    }

    // If options.fallbackExtract is provided, attempt domain-specific fallback extraction
    if (options?.fallbackExtract) {
        const fallbackResult = options.fallbackExtract(cleaned, rawText);
        if (fallbackResult !== null && fallbackResult !== undefined) {
            return fallbackResult;
        }
    }

    const providerName = options?.provider === 'gemini' ? 'Gemini' : 'LiteLLM';
    const contextPrefix = options?.errorContext ? `${options.errorContext}: ` : '';
    const snippet = rawText.length > 150 ? `${rawText.slice(0, 150)}...` : rawText;
    console.error(`[LLM JSON Parser Error] ${contextPrefix}Failed to parse output. Raw output:`, rawText);
    throw new Error(`Failed to parse ${providerName} JSON output: ${snippet}`);
};
