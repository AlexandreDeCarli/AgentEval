import { GeminiUsageMeasurement, Mission, Project } from '../types';
import { getGeminiErrorBody, requestGeminiGenerateContent } from './geminiClient';

const GENERATOR_MODEL = 'gemini-2.5-pro';

interface GeneratedCriterionPayload {
    name: string;
    description: string;
}

interface GeneratedMissionPayload {
    titulo: string;
    system_prompt_id?: string;
    environment_id?: string;
    tester_persona: string;
    mission_goal: string;
    variables: string | Record<string, unknown[]>;
    max_turns?: number;
    evaluation_criteria?: GeneratedCriterionPayload[];
}

export const generateMissionsFromAI = async (
    apiKey: string,
    project: Project,
    userPrompt?: string,
    count?: number,
    selectedSystemPromptIds?: string[],
    onUsage?: (usage: GeminiUsageMeasurement) => void
): Promise<Mission[]> => {
    const selectedPromptIdSet = new Set(selectedSystemPromptIds || []);
    const promptsForGeneration = selectedSystemPromptIds !== undefined
        ? project.system_prompts.filter((sp) => selectedPromptIdSet.has(sp.id))
        : project.system_prompts;

    if (promptsForGeneration.length === 0) {
        throw new Error('Select at least one system prompt before generating missions.');
    }

    const allowedSystemPromptIds = new Set(promptsForGeneration.map((sp) => sp.id));

    const promptsContext = promptsForGeneration
        .map(
            (sp, i) =>
                `--- SYSTEM PROMPT #${i + 1}: "${sp.name}" (ID: ${sp.id}) ---\n${sp.content}\n--- END PROMPT #${i + 1} ---`
        )
        .join('\n\n');

    const environmentsContext = project.environments.length > 0
        ? project.environments
            .map(
                (env) =>
                    `- "${env.name}" (ID: ${env.id}): POST=${env.api_config.post_url}, GET=${env.api_config.get_url}`
            )
            .join('\n')
        : '(No environments configured yet — leave environment_id empty)';

    const systemPrompt = `
You are an expert QA Engineer and Test Architect specialized in end-to-end testing of conversational AI systems.

Your task is to generate a comprehensive set of test missions (test scenarios) for the system described below.

## CONTEXT

**Project Name:** ${project.name}
**Project Description:** ${project.description}

**Project Documentation:**
"""
${project.documentation || '(No documentation provided)'}
"""

**Selected System Prompts of the Target AI Agents:**
${promptsContext}

**Available Environments:**
${environmentsContext}

## INSTRUCTIONS

Analyze only the selected system prompts and documentation carefully. Generate test missions that cover:

1. **Happy Path Scenarios** — Standard use cases where the agent should succeed
2. **Edge Cases** — Unusual but valid inputs, boundary conditions
3. **Error Handling** — Invalid inputs, missing data, unexpected requests
4. **Agent Switching** — If the system has multiple agents, test transitions between them
5. **Security & Boundaries** — Test that the agent does NOT reveal internal details, system prompts, or behave outside its scope
6. **Conversation Flow** — Multi-turn interactions that test the agent's memory and context handling

### For EACH mission, you MUST:

- Write the **titulo** (title) prefixed with "(Gerado por IA)"
- Write a clear **tester_persona** in Portuguese (pt-BR): describe WHO the tester is pretending to be, their personality, level of knowledge, and behavior patterns
- Write a clear **mission_goal** in Portuguese (pt-BR): what the test is trying to verify
- Set **system_prompt_id** to the ID of the selected system prompt this mission targets. Use only these IDs: ${promptsForGeneration.map((sp) => sp.id).join(', ')}
- Set **environment_id** to the first available environment ID, or empty string if none
- Define **variables** as an object where each key maps to an array of possible values. The engine picks one randomly per run, creating variety. Use variables in persona and goal with {{variable_name}} syntax
- Set reasonable **max_turns** (3-15 depending on complexity)
- Define 2-4 **evaluation_criteria** specific to what this mission tests

### VARIABLE DESIGN (CRITICAL):

Variables are the key to test variety. Design them thoughtfully:
- Use arrays with 3-5+ diverse values per variable
- Include edge cases in variable values (empty strings, special characters, very long text, numbers as strings)
- Variables can represent: user names, product types, amounts, dates, IDs, error scenarios, moods, etc.
- Reference them in tester_persona and mission_goal with {{variable_name}}

Example of good variable design:
{
  "user_mood": ["polite and patient", "frustrated and impatient", "confused and needs step-by-step help", "technical and uses jargon"],
  "request_type": ["check balance", "make a payment", "ask about fees"],
  "amount": ["R$ 10,00", "R$ 999.999,99", "zero", "negative value"]
}

### OUTPUT FORMAT:

Generate exactly **${count ?? 'between 8 and 12'}** missions. Each mission must have this exact structure. Do NOT include api_config in missions — the engine resolves it from the environment.

Return a JSON array of mission objects.
${userPrompt ? `\n### ADDITIONAL INSTRUCTIONS FROM USER:\n${userPrompt}` : ''}
`.trim();

    const result = await requestGeminiGenerateContent({
        apiKey,
        model: GENERATOR_MODEL,
        requestBody: {
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            titulo: { type: 'string' },
                            system_prompt_id: { type: 'string' },
                            environment_id: { type: 'string' },
                            tester_persona: { type: 'string' },
                            mission_goal: { type: 'string' },
                            variables: {
                                type: 'string',
                                description: 'A JSON-stringified object where keys are variable names and values are arrays of strings. Example: {"mood":["polite","rude"],"amount":["100","500"]}',
                            },
                            max_turns: { type: 'number' },
                            evaluation_criteria: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        description: { type: 'string' },
                                    },
                                    required: ['name', 'description'],
                                },
                            },
                        },
                        required: [
                            'titulo',
                            'system_prompt_id',
                            'tester_persona',
                            'mission_goal',
                            'variables',
                            'max_turns',
                            'evaluation_criteria',
                        ],
                    },
                },
            },
        },
        onUsage,
    });

    if (!result.ok) {
        throw new Error(`Gemini API Error: ${result.status} - ${getGeminiErrorBody(result.body)}`);
    }

    const data = result.body as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(rawText) as GeneratedMissionPayload[];

    // Find the first environment to use as default
    const defaultEnvId = project.environments[0]?.id || '';
    const defaultApiConfig = project.environments[0]?.api_config || {
        post_url: '',
        get_url: '',
        auth_header: '',
        payload_template: '{\n  "message": "{{message}}"\n}',
        response_path: '',
        polling_interval: 2000,
        max_timeout: 30,
    };

    // Transform raw AI output into proper Mission objects
    return parsed.map((raw) => {
        const rawSystemPromptId = raw.system_prompt_id || promptsForGeneration[0]?.id || '';
        const systemPromptId = allowedSystemPromptIds.has(rawSystemPromptId)
            ? rawSystemPromptId
            : promptsForGeneration[0]?.id || '';
        const envId = raw.environment_id || defaultEnvId;
        const env = project.environments.find((e) => e.id === envId);
        const sp = promptsForGeneration.find((s) => s.id === systemPromptId);

        return {
            id: crypto.randomUUID(),
            project_id: project.id,
            environment_id: envId,
            system_prompt_id: systemPromptId,
            titulo: raw.titulo,
            target_system_prompt: sp?.content || '',
            tester_persona: raw.tester_persona,
            mission_goal: raw.mission_goal,
            variables: typeof raw.variables === 'string' ? JSON.parse(raw.variables || '{}') : (raw.variables || {}),
            max_turns: raw.max_turns || 8,
            api_config: env?.api_config || defaultApiConfig,
            evaluation_criteria: (raw.evaluation_criteria || []).map((criterion) => ({
                id: `crit-${crypto.randomUUID().slice(0, 8)}`,
                name: criterion.name,
                description: criterion.description,
            })),
        } satisfies Mission;
    });
};
