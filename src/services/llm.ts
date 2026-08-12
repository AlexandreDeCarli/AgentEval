import {
    ChatMessage,
    DebugLogEntry,
    Evaluation,
    EvaluationCriterion,
    GeminiUsageMeasurement,
} from '../types';
import { DEFAULT_GEMINI_TARGET_MODEL } from '../utils/missionTarget';
import {
    extractGeminiText,
    getGeminiErrorBody,
    requestGeminiGenerateContent,
} from './geminiClient';

const PRIMARY_TESTER_MODEL = 'gemini-2.5-flash';
const FALLBACK_TESTER_MODEL = 'gemini-3.1-flash-lite';
const EVAL_MODEL = 'gemini-2.5-pro';

interface TesterResponsePayload {
    reasoning?: string;
    message?: string;
    missionCompleted?: boolean;
}

interface EvaluationResponsePayload {
    overall_score?: number;
    summary?: string;
    criteria_scores?: Evaluation['criteria_scores'];
    prompt_improvements?: Evaluation['prompt_improvements'];
    metrics?: Evaluation['metrics'];
}

const buildGeminiConversation = (chatHistory: ChatMessage[]) => {
    return chatHistory
        .filter((message) => message.role === 'tester' || message.role === 'target')
        .map((message) => ({
            role: message.role === 'target' ? 'model' : 'user',
            parts: [{ text: message.content }],
        }));
};

export const generateTesterMessage = async (
    apiKey: string,
    persona: string,
    goal: string,
    chatHistory: ChatMessage[],
    onUsage?: (usage: GeminiUsageMeasurement) => void
): Promise<{ message: string; missionCompleted: boolean }> => {
    if (!apiKey) throw new Error('API Key is missing');

    const historyText = chatHistory
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

    const systemPrompt = `
You are the TESTER in an automated QA system evaluating an AI agent (TARGET).

YOUR PERSONA: ${persona}
YOUR MISSION GOAL: ${goal}

CURRENT CHAT HISTORY:
${historyText || '(No messages exchanged yet)'}

RULES FOR GENERATING YOUR NEXT MESSAGE AND DETERMINING "missionCompleted":
1. YOUR MESSAGE:
   - Stay in persona.
   - Advance the conversation towards fulfilling the MISSION GOAL.
   - If the TARGET asked a question or requested details (e.g., ID, order number, confirmation), provide the requested information if allowed by your persona.

2. RULES FOR "missionCompleted" (CRITICAL ANALYSIS):
   - Set "missionCompleted" to TRUE ONLY IF the TARGET agent has FULLY satisfied and completed the MISSION GOAL in the chat history.
   - Set "missionCompleted" to FALSE if ANY of the following apply:
     a) The TARGET agent has not yet provided the final answer, confirmation, or action required by the goal.
     b) The TARGET agent asked a question, requested data, or gave an intermediate response, and needs to process your next reply.
     c) You are providing a necessary answer or input that the TARGET still needs to act upon.
     d) The scenario requires multi-turn interaction and all steps have not been completed by the TARGET.
   - DO NOT set "missionCompleted" to true prematurely.

Output JSON with:
- "reasoning": A brief evaluation of whether the TARGET agent has fully satisfied the goal yet.
- "message": Your next message to the TARGET.
- "missionCompleted": boolean (strictly following the rules above).
`.trim();

    const attemptGeneration = async (model: string) => {
        const result = await requestGeminiGenerateContent({
            apiKey,
            model,
            requestBody: {
                contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: 'object',
                        properties: {
                            reasoning: { type: 'string' },
                            message: { type: 'string' },
                            missionCompleted: { type: 'boolean' },
                        },
                        required: ['message', 'missionCompleted'],
                    },
                },
            },
            onUsage,
        });

        if (!result.ok) {
            throw new Error(
                `Gemini API Error (${model}): ${result.status} - ${getGeminiErrorBody(result.body)}`
            );
        }
        return result.body;
    };

    let responseBody: unknown;
    try {
        responseBody = await attemptGeneration(PRIMARY_TESTER_MODEL);
    } catch (primaryError) {
        console.warn(`Primary model (${PRIMARY_TESTER_MODEL}) failed, trying fallback (${FALLBACK_TESTER_MODEL})...`, primaryError);
        try {
            responseBody = await attemptGeneration(FALLBACK_TESTER_MODEL);
        } catch (fallbackError) {
            throw new Error(`Both models failed. Primary Error: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}. Fallback Error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
        }
    }

    const rawText = extractGeminiText(responseBody);

    if (!rawText) throw new Error('Empty response from Gemini');

    try {
        const parsed = JSON.parse(rawText) as TesterResponsePayload;
        return {
            message: parsed.message || '...',
            missionCompleted: !!parsed.missionCompleted,
        };
    } catch {
        throw new Error('Failed to parse Gemini JSON output');
    }
};

export const generateEvaluation = async (
    apiKey: string,
    chatHistory: ChatMessage[],
    targetSystemPrompt: string,
    missionGoal: string,
    maxTurns: number,
    criteria: EvaluationCriterion[],
    metrics: { avg_time_to_first_response_ms: number; avg_time_to_complete_response_ms: number; },
    evalModel?: string,
    onUsage?: (usage: GeminiUsageMeasurement) => void
): Promise<Evaluation> => {
    if (!apiKey) throw new Error('API Key is missing');

    const historyText = chatHistory
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

    const criteriaText = criteria
        .map(c => `- [${c.id}] ${c.name}: ${c.description}`)
        .join('\n');

    const systemPrompt = `
You are the EVALUATOR in an automated QA system.
Your job is to deeply analyze this conversation and grade it based on specific criteria. Note that this test had a limit of ${maxTurns} turns.

Target's Original System Prompt:
"""
${targetSystemPrompt}
"""

Mission Goal the tester was trying to achieve:
"""
${missionGoal}
"""

Evaluation Criteria:
${criteriaText}

Performance Metrics from Engine:
- Average Time to First Response: ${metrics.avg_time_to_first_response_ms}ms
- Average Time to Complete Response: ${metrics.avg_time_to_complete_response_ms}ms

Chat History:
"""
${historyText}
"""

Analyze this carefully. Be a strict grader! 
Use the full scale (0-100 for overall, 0-10 for individual criteria). 
- 10/10: Perfect, no room for improvement.
- 7-9/10: Good, but minor issues.
- 5/10: Average, significant issues or missing opportunities.
- 1-4/10: Poor performance, major failures.
- 0/10: Complete failure to follow instructions or dangerous behavior.

Did the Target agent fulfill the goal efficiently? How did it perform against each criterion?
Are there specific parts of the Target's Original System Prompt that should be improved to avoid the issues you saw?`.trim();

    const result = await requestGeminiGenerateContent({
        apiKey,
        model: evalModel || EVAL_MODEL,
        requestBody: {
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'object',
                    properties: {
                        overall_score: { type: 'number' },
                        summary: { type: 'string' },
                        criteria_scores: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    criterion_id: { type: 'string' },
                                    score: { type: 'number' },
                                    justification: { type: 'string' },
                                },
                                required: ['criterion_id', 'score', 'justification'],
                            },
                        },
                        prompt_improvements: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    target_text: { type: 'string' },
                                    suggested_text: { type: 'string' },
                                    justification: { type: 'string' },
                                    severity: {
                                        type: 'string',
                                        enum: ['critico', 'importante', 'sugestão'],
                                    },
                                },
                                required: [
                                    'target_text',
                                    'suggested_text',
                                    'justification',
                                    'severity',
                                ],
                            },
                        },
                        metrics: {
                            type: 'object',
                            properties: {
                                avg_time_to_first_response_ms: { type: 'number' },
                                avg_time_to_complete_response_ms: { type: 'number' },
                            },
                            required: [
                                'avg_time_to_first_response_ms',
                                'avg_time_to_complete_response_ms',
                            ],
                        },
                    },
                    required: [
                        'overall_score',
                        'summary',
                        'criteria_scores',
                        'prompt_improvements',
                        'metrics',
                    ],
                },
            },
        },
        onUsage,
    });

    if (!result.ok) {
        throw new Error(
            `Gemini Eval API Error: ${result.status} - ${getGeminiErrorBody(result.body)}`
        );
    }

    const rawText = extractGeminiText(result.body);

    if (!rawText) throw new Error('Empty response from Gemini');

    try {
        const parsed = JSON.parse(rawText) as EvaluationResponsePayload;
        return {
            overall_score: parsed.overall_score || 0,
            summary: parsed.summary || 'No summary',
            criteria_scores: parsed.criteria_scores || [],
            prompt_improvements: parsed.prompt_improvements || [],
            metrics: parsed.metrics || metrics
        };
    } catch {
        throw new Error('Failed to parse Gemini evaluation JSON output');
    }
};

export const generateGeminiTargetResponse = async (
    apiKey: string,
    model: string,
    targetSystemPrompt: string,
    chatHistory: ChatMessage[],
    signal?: AbortSignal,
    onDebugLog?: (entry: DebugLogEntry) => void,
    onUsage?: (usage: GeminiUsageMeasurement) => void
): Promise<string> => {
    if (!apiKey) throw new Error('API Key is missing');

    const targetModel = model.trim() || DEFAULT_GEMINI_TARGET_MODEL;
    const requestBody: Record<string, unknown> = {
        contents: buildGeminiConversation(chatHistory),
        generationConfig: {
            responseMimeType: 'text/plain',
        },
    };

    if (targetSystemPrompt.trim()) {
        requestBody.systemInstruction = {
            parts: [{ text: targetSystemPrompt }],
        };
    }

    const result = await requestGeminiGenerateContent({
        apiKey,
        model: targetModel,
        requestBody,
        signal,
        onUsage,
    });

    onDebugLog?.({
        id: crypto.randomUUID(),
        timestamp: Date.now() - result.duration,
        type: 'POST',
        url: result.url,
        status: result.status,
        duration: result.duration,
        requestBody,
        response: result.body,
    });

    if (!result.ok) {
        throw new Error(
            `Gemini Target API Error (${targetModel}): ${result.status} - ${getGeminiErrorBody(result.body)}`
        );
    }

    const text = extractGeminiText(result.body);

    if (!text || !String(text).trim()) {
        throw new Error(`Empty response from Gemini target model (${targetModel})`);
    }

    return String(text).trim();
};
