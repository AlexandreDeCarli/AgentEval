type JsonRecord = Record<string, unknown>;

export interface ChatMessageSummaryField {
    label: string;
    value: string;
    tone?: 'default' | 'code';
}

export type ChatMessageContentDescription =
    | {
        kind: 'plain_text';
        text: string;
    }
    | {
        kind: 'function_call' | 'structured_output';
        title: string;
        formattedJson: string;
        topLevelKeys: string[];
        responseText?: string;
        functionName?: string;
        summaryFields: ChatMessageSummaryField[];
    };

const FUNCTION_KEYS = [
    'functionToExecute',
    'functionName',
    'function_call',
    'functionCall',
    'toolCall',
    'tool_calls',
    'toolCalls',
];

const RESPONSE_KEYS = [
    'userResponse',
    'message',
    'response',
    'text',
    'content',
];

const ARGUMENT_KEYS = [
    'parameters',
    'arguments',
    'args',
    'functionArgs',
    'functionArguments',
];

const isRecord = (value: unknown): value is JsonRecord =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const stringifyValue = (value: unknown) => {
    if (typeof value === 'string') return value;
    if (value === undefined) return '';
    return JSON.stringify(value, null, 2);
};

const stripJsonFence = (content: string) => {
    const trimmed = content.trim();
    const match = trimmed.match(/^```(?:json|JSON)?\s*([\s\S]*?)\s*```$/);
    return match ? match[1].trim() : trimmed;
};

const parseJsonCandidate = (content: string): unknown => {
    const candidate = stripJsonFence(content);
    try {
        const parsed: unknown = JSON.parse(candidate);
        if (typeof parsed === 'string') {
            const nested = stripJsonFence(parsed);
            if (nested.startsWith('{') || nested.startsWith('[')) {
                try {
                    return JSON.parse(nested);
                } catch {
                    return parsed;
                }
            }
        }
        return parsed;
    } catch {
        return undefined;
    }
};

const getTopLevelKeys = (value: unknown) => {
    if (Array.isArray(value)) {
        return [`${value.length} item${value.length === 1 ? '' : 's'}`];
    }
    if (!isRecord(value)) return [];
    return Object.keys(value);
};

const readNestedFunctionName = (value: unknown): string | undefined => {
    if (!isRecord(value)) return undefined;

    const directName = value.name;
    if (typeof directName === 'string' && directName.trim()) {
        return directName;
    }

    const nestedFunction = value.function;
    if (isRecord(nestedFunction) && typeof nestedFunction.name === 'string') {
        return nestedFunction.name;
    }

    return undefined;
};

const getFunctionName = (value: unknown): string | undefined => {
    if (!isRecord(value)) return undefined;

    const directFunction = value.functionToExecute ?? value.functionName;
    if (typeof directFunction === 'string' && directFunction.trim()) {
        return directFunction;
    }

    const functionCall = value.function_call ?? value.functionCall ?? value.toolCall;
    const nestedName = readNestedFunctionName(functionCall);
    if (nestedName) return nestedName;

    const toolCalls = value.tool_calls ?? value.toolCalls;
    if (Array.isArray(toolCalls)) {
        for (const call of toolCalls) {
            const toolName = readNestedFunctionName(call);
            if (toolName) return toolName;
        }
    }

    if (FUNCTION_KEYS.some((key) => key in value)) {
        return 'Function call';
    }

    return undefined;
};

const hasFunctionCall = (value: unknown) => {
    if (!isRecord(value)) return false;
    return Boolean(getFunctionName(value));
};

const getResponseText = (value: unknown): string | undefined => {
    if (!isRecord(value)) return undefined;

    for (const key of RESPONSE_KEYS) {
        const candidate = value[key];
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate;
        }
    }

    const functionResult = value.functionResult;
    if (isRecord(functionResult)) {
        const data = functionResult.data;
        if (typeof data === 'string' && data.trim()) {
            return data;
        }
    }

    return undefined;
};

const readNestedArguments = (value: unknown): unknown => {
    if (!isRecord(value)) return undefined;

    for (const key of ARGUMENT_KEYS) {
        if (value[key] !== undefined) {
            return value[key];
        }
    }

    const nestedFunction = value.function;
    if (isRecord(nestedFunction)) {
        for (const key of ARGUMENT_KEYS) {
            if (nestedFunction[key] !== undefined) {
                return nestedFunction[key];
            }
        }
    }

    return undefined;
};

const getArgumentsValue = (value: unknown): unknown => {
    if (!isRecord(value)) return undefined;

    for (const key of ARGUMENT_KEYS) {
        if (value[key] !== undefined) {
            return value[key];
        }
    }

    const functionCall = value.function_call ?? value.functionCall ?? value.toolCall;
    const nestedArgs = readNestedArguments(functionCall);
    if (nestedArgs !== undefined) return nestedArgs;

    const toolCalls = value.tool_calls ?? value.toolCalls;
    if (Array.isArray(toolCalls)) {
        for (const call of toolCalls) {
            const toolArgs = readNestedArguments(call);
            if (toolArgs !== undefined) return toolArgs;
        }
    }

    return undefined;
};

const buildSummaryFields = (
    value: unknown,
    functionName?: string,
    responseText?: string
): ChatMessageSummaryField[] => {
    const fields: ChatMessageSummaryField[] = [];

    if (functionName) {
        fields.push({ label: 'Function', value: functionName, tone: 'code' });
    }

    const argumentsValue = getArgumentsValue(value);
    if (argumentsValue !== undefined) {
        fields.push({ label: 'Arguments', value: stringifyValue(argumentsValue), tone: 'code' });
    }

    if (responseText) {
        fields.push({ label: 'Response', value: responseText });
    }

    return fields;
};

export const describeChatMessageContent = (content: unknown): ChatMessageContentDescription => {
    if (typeof content !== 'string') {
        return {
            kind: 'plain_text',
            text: String(content ?? ''),
        };
    }

    const parsed = parseJsonCandidate(content);
    if (!isRecord(parsed) && !Array.isArray(parsed)) {
        return {
            kind: 'plain_text',
            text: content,
        };
    }

    const functionName = getFunctionName(parsed);
    const responseText = getResponseText(parsed);
    const kind = hasFunctionCall(parsed) ? 'function_call' : 'structured_output';

    return {
        kind,
        title: kind === 'function_call' ? 'Function call' : 'Structured output',
        formattedJson: JSON.stringify(parsed, null, 2),
        topLevelKeys: getTopLevelKeys(parsed),
        responseText,
        functionName,
        summaryFields: buildSummaryFields(parsed, functionName, responseText),
    };
};
