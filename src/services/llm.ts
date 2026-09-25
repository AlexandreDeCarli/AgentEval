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
import {
    extractLiteLlmText,
    getLiteLlmErrorMessage,
    LiteLlmChatMessage,
    requestLiteLlmChatCompletion,
} from './litellmClient';
import { executeWithModelFallback } from './modelFallbackRunner';
import { getEvaluationLanguageInstruction } from '../config/evaluationLanguages';
import { useSettingsStore } from '../store/useSettingsStore';
import { extractLlmJson } from '../utils/llmJsonParser';

const PRIMARY_TESTER_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_TESTER_MODEL_1 = 'gemini-3.1-flash-lite';
const FALLBACK_TESTER_MODEL_2 = 'gemini-2.5-flash';

const DEFAULT_EVAL_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_EVAL_MODEL_1 = 'gemini-3.1-flash-lite';
const FALLBACK_EVAL_MODEL_2 = 'gemini-2.5-flash';

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

const fallbackExtractTesterMessage = (cleaned: string): TesterResponsePayload | null => {
    if (!cleaned || cleaned.trim() === '...') return null;

    const messageMatch = cleaned.match(
        /(?:^|\n)\s*(?:message|mensagem)\s*[:=]\s*(?:["']?)([\s\S]*?)(?:["']?\s*(?:(?:\n\s*(?:reasoning|raciocinio|missionCompleted|mission_completed|status))|$))/i
    );
    const completedMatch = cleaned.match(
        /(?:missionCompleted|mission_completed|missaoConcluida|missao_concluida)\s*[:=]\s*(true|false)/i
    );

    if (messageMatch && messageMatch[1].trim() && messageMatch[1].trim() !== '...') {
        return {
            message: messageMatch[1].trim(),
            missionCompleted: completedMatch ? completedMatch[1].toLowerCase() === 'true' : false,
        };
    }

    if (!cleaned.startsWith('{') && !cleaned.startsWith('[') && !cleaned.startsWith('```')) {
        return {
            message: cleaned.trim(),
            missionCompleted: false,
        };
    }

    return null;
};

export const extractTesterMessageAndStatus = (
    parsed: unknown,
    _persona?: string,
    goal?: string
): { message: string; missionCompleted: boolean } => {
    if (!parsed || typeof parsed !== 'object') {
        return {
            message: goal ? `Hello, I need assistance regarding: ${goal}` : '',
            missionCompleted: false,
        };
    }

    const obj = parsed as Record<string, unknown>;

    // 1. Mission completed flag resolution across languages and schemas
    const missionCompleted = Boolean(
        obj.missionCompleted ??
        obj.mission_completed ??
        obj.completed ??
        obj.isCompleted ??
        obj.concluido ??
        obj.missaoConcluida ??
        obj.missao_concluida ??
        obj.finalizado ??
        false
    );

    // 2. Candidate message keys across schemas and languages
    const candidateKeys = [
        'message',
        'mensagem',
        'msg',
        'response',
        'resposta',
        'reply',
        'text',
        'texto',
        'content',
        'conteudo',
        'tester_message',
        'testerMessage',
        'next_message',
        'nextMessage',
        'prompt',
        'user_message',
        'userMessage',
        'output',
        'utterance'
    ];

    let messageText: string | undefined;

    for (const key of candidateKeys) {
        const val = obj[key];
        if (typeof val === 'string' && val.trim() && val.trim() !== '...') {
            messageText = val.trim();
            break;
        } else if (val && typeof val === 'object') {
            const nested = val as Record<string, unknown>;
            for (const subKey of ['text', 'content', 'message', 'mensagem', 'value']) {
                if (typeof nested[subKey] === 'string' && (nested[subKey] as string).trim() && (nested[subKey] as string).trim() !== '...') {
                    messageText = (nested[subKey] as string).trim();
                    break;
                }
            }
            if (messageText) break;
        }
    }

    // 3. If message is still empty, look for any string property that isn't reasoning/thought
    if (!messageText) {
        for (const [key, val] of Object.entries(obj)) {
            if (
                typeof val === 'string' &&
                val.trim() &&
                val.trim() !== '...' &&
                !['reasoning', 'raciocinio', 'thought', 'think', 'justification', 'status', 'explicacao'].includes(key.toLowerCase())
            ) {
                messageText = val.trim();
                break;
            }
        }
    }

    // 4. If missionCompleted is true and no message was provided, return empty string (clean completion)
    if (!messageText && missionCompleted) {
        return {
            message: '',
            missionCompleted: true,
        };
    }

    // 5. If mission is NOT completed, but message is still empty, try to salvage from reasoning or goal
    if (!messageText) {
        const reasoning = (typeof obj.reasoning === 'string' ? obj.reasoning : '') ||
                          (typeof obj.raciocinio === 'string' ? obj.raciocinio : '');
        if (reasoning.trim() && reasoning.trim() !== '...') {
            const quotedMatch = reasoning.match(/["']([^"']{5,})["']/);
            if (quotedMatch && quotedMatch[1].trim()) {
                messageText = quotedMatch[1].trim();
            } else {
                messageText = reasoning.trim();
            }
        } else if (goal) {
            messageText = `Hello, I need assistance regarding: ${goal}`;
        } else {
            messageText = '';
        }
    }

    return {
        message: messageText,
        missionCompleted,
    };
};

export const generateTesterMessage = async (
    apiKey: string,
    persona: string,
    goal: string,
    chatHistory: ChatMessage[],
    onUsage?: (usage: GeminiUsageMeasurement) => void
): Promise<{ message: string; missionCompleted: boolean }> => {
    const settings = useSettingsStore.getState();
    const provider = settings.aiProvider || 'gemini';

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
   - NEVER output "..." or empty placeholders when speaking to the TARGET.

2. RULES FOR "missionCompleted" (CRITICAL ANALYSIS):
   - Set "missionCompleted" to TRUE ONLY IF the TARGET agent has FULLY satisfied and completed the MISSION GOAL in the chat history.
   - Set "missionCompleted" to FALSE if ANY of the following apply:
     a) The TARGET agent has not yet provided the final answer, confirmation, or action required by the goal.
     b) The TARGET agent asked a question, requested data, or gave an intermediate response, and needs to process your next reply.
     c) You are providing a necessary answer or input that the TARGET still needs to act upon.
     d) The scenario requires multi-turn interaction and all steps have not been completed by the TARGET.
   - DO NOT set "missionCompleted" to true prematurely.

Output JSON with keys strictly in English:
- "reasoning": A brief evaluation of whether the TARGET agent has fully satisfied the goal yet.
- "message": Your next message to the TARGET (or brief polite closing if goal is already satisfied).
- "missionCompleted": boolean (strictly following the rules above).
`.trim();

    if (provider === 'litellm') {
        const key = settings.litellmApiKey?.trim() || apiKey?.trim();
        if (!key) throw new Error('LiteLLM API Key is missing. Configure it in Settings > AI Configuration.');

        const model =
            settings.litellmTesterModel?.trim() ||
            settings.litellmEvaluatorModel?.trim() ||
            'gpt-4o-mini';

        const messages: LiteLlmChatMessage[] = [
            {
                role: 'system',
                content: `${systemPrompt}\n\nCRITICAL INSTRUCTION: You MUST output ONLY a valid JSON object matching the requested schema. Do NOT include markdown code fences, thought tags, or any text before or after the JSON.`,
            },
            {
                role: 'user',
                content: `CURRENT CONVERSATION HISTORY:\n${historyText || '(No messages exchanged yet. You are starting the conversation.)'}\n\nGenerate your next tester response and status now as JSON.`,
            },
        ];

        const result = await requestLiteLlmChatCompletion({
            baseUrl: settings.litellmBaseUrl,
            apiKey: key,
            model,
            messages,
            responseFormat: { type: 'json_object' },
            onUsage,
        });

        if (!result.ok) {
            throw new Error(
                `LiteLLM API Error (${model}): ${result.status} - ${getLiteLlmErrorMessage(result.body)}`
            );
        }

        const rawText = result.text || extractLiteLlmText(result.body);
        if (!rawText) throw new Error('Empty response from LiteLLM');

        const parsed = extractLlmJson<TesterResponsePayload>(rawText, {
            fallbackExtract: fallbackExtractTesterMessage,
            errorContext: `TesterAgent (${model})`,
        });

        return extractTesterMessageAndStatus(parsed, persona, goal);
    }

    // Google Gemini Provider
    if (!apiKey) throw new Error('API Key is missing');

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

    const modelsToTry = [
        PRIMARY_TESTER_MODEL,
        FALLBACK_TESTER_MODEL_1,
        FALLBACK_TESTER_MODEL_2,
    ];

    const { result: responseBody } = await executeWithModelFallback(
        modelsToTry,
        attemptGeneration,
        'TesterAgent'
    );

    const rawText = extractGeminiText(responseBody);

    if (!rawText) throw new Error('Empty response from Gemini');

    const parsed = extractLlmJson<TesterResponsePayload>(rawText, {
        fallbackExtract: fallbackExtractTesterMessage,
        errorContext: 'TesterAgent (Gemini)',
        provider: 'gemini',
    });

    return extractTesterMessageAndStatus(parsed, persona, goal);
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
    onUsage?: (usage: GeminiUsageMeasurement) => void,
    evaluationLanguage?: string
): Promise<Evaluation> => {
    const settings = useSettingsStore.getState();
    const provider = settings.aiProvider || 'gemini';

    const targetLanguage =
        evaluationLanguage?.trim() ||
        settings.evaluationLanguage?.trim() ||
        'pt-BR';
    const languageInstruction = getEvaluationLanguageInstruction(targetLanguage);

    const historyText = chatHistory
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

    const criteriaText = criteria
        .map(c => `- [${c.id}] ${c.name}: ${c.description}`)
        .join('\n');

    const systemPrompt = `
You are the EVALUATOR in an automated QA system.
Your job is to deeply analyze this conversation and grade it based on specific criteria. Note that this test had a limit of ${maxTurns} turns.

${languageInstruction}

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
Are there specific parts of the Target's Original System Prompt that should be improved to avoid the issues you saw?

## MANDATORY LANGUAGE SPECIFICATION:
${languageInstruction}`.trim();

    if (provider === 'litellm') {
        const key = settings.litellmApiKey?.trim() || apiKey?.trim();
        if (!key) throw new Error('LiteLLM API Key is missing. Configure it in Settings > AI Configuration.');

        const model =
            (evalModel && evalModel !== settings.evaluatorModel)
                ? evalModel.trim()
                : (settings.litellmEvaluatorModel?.trim() || 'gpt-4o-mini');

        const messages: LiteLlmChatMessage[] = [
            {
                role: 'system',
                content: `You are the EVALUATOR in an automated QA system.\nYour job is to deeply analyze this conversation and grade it based on specific criteria. Note that this test had a limit of ${maxTurns} turns.\n\n${languageInstruction}\n\nCRITICAL INSTRUCTION: You MUST output ONLY a valid JSON object matching this schema:\n{\n  "overall_score": number (0-100),\n  "summary": string,\n  "criteria_scores": [\n    { "criterion_id": string, "score": number (0-10), "justification": string }\n  ],\n  "prompt_improvements": [\n    { "target_text": string, "suggested_text": string, "justification": string, "severity": "critico" | "importante" | "sugestão" }\n  ],\n  "metrics": {\n    "avg_time_to_first_response_ms": ${metrics.avg_time_to_first_response_ms},\n    "avg_time_to_complete_response_ms": ${metrics.avg_time_to_complete_response_ms}\n  }\n}\nDo NOT include markdown code fences or conversational text outside the JSON.`,
            },
            {
                role: 'user',
                content: `Target's Original System Prompt:\n"""\n${targetSystemPrompt}\n"""\n\nMission Goal the tester was trying to achieve:\n"""\n${missionGoal}\n"""\n\nEvaluation Criteria:\n${criteriaText}\n\nPerformance Metrics from Engine:\n- Average Time to First Response: ${metrics.avg_time_to_first_response_ms}ms\n- Average Time to Complete Response: ${metrics.avg_time_to_complete_response_ms}ms\n\nChat History:\n"""\n${historyText}\n"""\n\nAnalyze this conversation and generate your evaluation now as JSON.`,
            },
        ];

        const result = await requestLiteLlmChatCompletion({
            baseUrl: settings.litellmBaseUrl,
            apiKey: key,
            model,
            messages,
            responseFormat: { type: 'json_object' },
            onUsage,
        });

        if (!result.ok) {
            throw new Error(
                `LiteLLM Eval API Error (${model}): ${result.status} - ${getLiteLlmErrorMessage(result.body)}`
            );
        }

        const rawText = result.text || extractLiteLlmText(result.body);
        if (!rawText) throw new Error('Empty response from LiteLLM evaluator');

        const parsed = extractLlmJson<EvaluationResponsePayload>(rawText, {
            errorContext: `EvaluatorAgent (${model})`,
        });

        return {
            overall_score: typeof parsed.overall_score === 'number' ? parsed.overall_score : 0,
            summary: parsed.summary || 'No summary',
            criteria_scores: Array.isArray(parsed.criteria_scores) ? parsed.criteria_scores : [],
            prompt_improvements: Array.isArray(parsed.prompt_improvements) ? parsed.prompt_improvements : [],
            metrics: parsed.metrics || metrics,
        };
    }

    // Google Gemini Provider
    if (!apiKey) throw new Error('API Key is missing');

    const attemptEval = async (model: string) => {
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
                `Gemini Eval API Error (${model}): ${result.status} - ${getGeminiErrorBody(result.body)}`
            );
        }
        return result.body;
    };

    const initialModel = evalModel?.trim() || DEFAULT_EVAL_MODEL;
    const modelsToTry: string[] = [initialModel];
    if (!modelsToTry.includes(FALLBACK_EVAL_MODEL_1)) {
        modelsToTry.push(FALLBACK_EVAL_MODEL_1);
    }
    if (!modelsToTry.includes(FALLBACK_EVAL_MODEL_2)) {
        modelsToTry.push(FALLBACK_EVAL_MODEL_2);
    }

    const { result: responseBody } = await executeWithModelFallback(
        modelsToTry,
        attemptEval,
        'EvaluatorAgent'
    );

    const rawText = extractGeminiText(responseBody);

    if (!rawText) throw new Error('Empty response from Gemini');

    const parsed = extractLlmJson<EvaluationResponsePayload>(rawText, {
        errorContext: 'EvaluatorAgent (Gemini)',
        provider: 'gemini',
    });

    return {
        overall_score: parsed.overall_score || 0,
        summary: parsed.summary || 'No summary',
        criteria_scores: parsed.criteria_scores || [],
        prompt_improvements: parsed.prompt_improvements || [],
        metrics: parsed.metrics || metrics,
    };
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

export const generateLiteLlmTargetResponse = async (
    apiKey: string,
    model: string,
    targetSystemPrompt: string,
    chatHistory: ChatMessage[],
    signal?: AbortSignal,
    onDebugLog?: (entry: DebugLogEntry) => void,
    onUsage?: (usage: GeminiUsageMeasurement) => void,
    baseUrl?: string
): Promise<string> => {
    const settings = useSettingsStore.getState();
    const key = apiKey.trim() || settings.litellmApiKey.trim();
    if (!key) throw new Error('LiteLLM API Key is missing for Target agent');

    const targetModel = model.trim() || settings.litellmEvaluatorModel.trim() || 'gpt-4o-mini';
    const targetBaseUrl = baseUrl || settings.litellmBaseUrl;

    const messages: LiteLlmChatMessage[] = [];
    if (targetSystemPrompt.trim()) {
        messages.push({
            role: 'system',
            content: targetSystemPrompt.trim(),
        });
    }

    for (const msg of chatHistory) {
        if (msg.role === 'tester') {
            messages.push({ role: 'user', content: msg.content });
        } else if (msg.role === 'target') {
            messages.push({ role: 'assistant', content: msg.content });
        }
    }

    const result = await requestLiteLlmChatCompletion({
        baseUrl: targetBaseUrl,
        apiKey: key,
        model: targetModel,
        messages,
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
        requestBody: { model: targetModel, messages },
        response: result.body,
    });

    if (!result.ok) {
        throw new Error(
            `LiteLLM Target API Error (${targetModel}): ${result.status} - ${getLiteLlmErrorMessage(result.body)}`
        );
    }

    const text = result.text || extractLiteLlmText(result.body);
    if (!text || !String(text).trim()) {
        throw new Error(`Empty response from LiteLLM target model (${targetModel})`);
    }

    return String(text).trim();
};
