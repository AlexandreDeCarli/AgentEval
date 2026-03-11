import { ChatMessage, Evaluation, EvaluationCriterion } from '../types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';
const GEMINI_EVAL_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent';

export const generateTesterMessage = async (
    apiKey: string,
    persona: string,
    goal: string,
    chatHistory: ChatMessage[]
): Promise<{ message: string; missionCompleted: boolean }> => {
    if (!apiKey) throw new Error('API Key is missing');

    // Convert history to Gemini format (user/model)    
    // Our 'tester' acts as 'user', and the 'target' acts as 'model' to the LLM
    // Actually, we are simulating the tester. So we prompt the LLM to BE the tester.
    // The LLM playing tester gets history of what target said (user) and its own previous sayings (model).
    // Wait, let's just pass all history as text.

    const historyText = chatHistory
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

    const systemPrompt = `
You are the TESTER in an automated QA system.
Your instructions: ${persona}
Your goal: ${goal}

Current Chat History:
${historyText || '(No messages yet)'}

Based on the chat history, what is your next message to the TARGET?`.trim();

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        message: { type: "string" },
                        missionCompleted: { type: "boolean" }
                    },
                    required: ["message", "missionCompleted"]
                }
            }
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) throw new Error('Empty response from Gemini');

    try {
        const parsed = JSON.parse(rawText);
        return {
            message: parsed.message || '...',
            missionCompleted: !!parsed.missionCompleted,
        };
    } catch (e) {
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
    metrics: { avg_time_to_first_response_ms: number; avg_time_to_complete_response_ms: number; }
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

    const response = await fetch(`${GEMINI_EVAL_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        overall_score: { type: "number" },
                        summary: { type: "string" },
                        criteria_scores: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    criterion_id: { type: "string" },
                                    score: { type: "number" },
                                    justification: { type: "string" }
                                },
                                required: ["criterion_id", "score", "justification"]
                            }
                        },
                        prompt_improvements: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    target_text: { type: "string" },
                                    suggested_text: { type: "string" },
                                    justification: { type: "string" },
                                    severity: { type: "string", enum: ["critico", "importante", "sugestão"] }
                                },
                                required: ["target_text", "suggested_text", "justification", "severity"]
                            }
                        },
                        metrics: {
                            type: "object",
                            properties: {
                                avg_time_to_first_response_ms: { type: "number" },
                                avg_time_to_complete_response_ms: { type: "number" }
                            },
                            required: ["avg_time_to_first_response_ms", "avg_time_to_complete_response_ms"]
                        }
                    },
                    required: ["overall_score", "summary", "criteria_scores", "prompt_improvements", "metrics"]
                }
            }
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini Eval API Error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) throw new Error('Empty response from Gemini');

    try {
        const parsed = JSON.parse(rawText);
        return {
            overall_score: parsed.overall_score || 0,
            summary: parsed.summary || 'No summary',
            criteria_scores: parsed.criteria_scores || [],
            prompt_improvements: parsed.prompt_improvements || [],
            metrics: parsed.metrics || metrics
        };
    } catch (e) {
        throw new Error('Failed to parse Gemini evaluation JSON output');
    }
};
