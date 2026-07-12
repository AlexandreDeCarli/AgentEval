export interface ApiConfig {
    post_url: string;
    get_url: string;
    auth_header: string;
    payload_template: string;
    response_path: string;
    polling_interval: number;
    max_timeout: number;
}

export type TargetProvider = 'http' | 'gemini';

export interface EvaluationCriterion {
    id: string;
    name: string;
    description: string;
}

export interface SystemPrompt {
    id: string;
    name: string;
    content: string;
}

export interface Environment {
    id: string;
    name: string;
    api_config: ApiConfig;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    documentation: string;
    target_provider?: TargetProvider;
    target_gemini_model?: string;
    system_prompts: SystemPrompt[];
    environments: Environment[];
}

export interface Mission {
    id: string;
    project_id?: string;
    environment_id?: string;
    system_prompt_id?: string;
    target_provider?: TargetProvider;
    target_gemini_model?: string;
    titulo: string;
    target_system_prompt: string;
    tester_persona: string;
    mission_goal: string;
    variables: Record<string, unknown[]>;
    max_turns: number;
    api_config: ApiConfig;
    evaluation_criteria?: EvaluationCriterion[];
}

export interface ChatMessage {
    id: string;
    role: 'tester' | 'target' | 'system';
    content: string;
    structuredContent?: string;
    timestamp: number;
    isCompletedFlag?: boolean;
    isProcessing?: boolean;
}

export interface PromptImprovement {
    target_text: string;
    suggested_text: string;
    justification: string;
    severity: 'critico' | 'importante' | 'sugestão';
}

export interface CriterionScore {
    criterion_id: string;
    score: number;
    justification: string;
}

export interface Evaluation {
    overall_score: number;
    summary: string;
    criteria_scores: CriterionScore[];
    prompt_improvements: PromptImprovement[];
    metrics: {
        avg_time_to_first_response_ms: number;
        avg_time_to_complete_response_ms: number;
    };
}

export interface DebugLogEntry {
    id: string;
    timestamp: number;
    type: 'POST' | 'GET';
    url: string;
    status: number;
    duration: number;
    requestBody?: unknown;
    response: unknown;
}

export interface TestRun {
    id: string;
    mission_id: string;
    status: 'running' | 'success' | 'failed';
    chat_history: ChatMessage[];
    evaluation: Evaluation | null;
    resolved_variables: Record<string, unknown>;
    debug_logs: DebugLogEntry[];
    created_at: number;
    updated_at: number;
    error?: string;
}

export type AiRoutine =
    | 'mission_generation'
    | 'tester_conversation'
    | 'gemini_target'
    | 'evaluation';

export type AiPricingStatus = 'priced' | 'unpriced' | 'unpriced_cache';

export interface GeminiUsageMeasurement {
    requestedModel: string;
    resolvedModel: string;
    responseId?: string;
    promptTokens: number;
    candidateTokens: number;
    thinkingTokens: number;
    cachedTokens: number;
    totalTokens: number;
}

export interface AiUsageContext {
    routine: AiRoutine;
    projectId?: string;
    missionId?: string;
    runId?: string;
}

export interface AiPricingSnapshot {
    pricingVersion: string;
    pricingDate: string;
    currency: 'USD';
    inputPerMillionUsd: number;
    outputPerMillionUsd: number;
    source: string;
    promptThresholdTokens?: number;
}

export interface AiUsageEvent extends AiUsageContext {
    id: string;
    occurredAt: number;
    requestedModel: string;
    resolvedModel: string;
    responseId?: string;
    inputTokens: number;
    candidateTokens: number;
    thinkingTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
    totalTokens: number;
    pricingStatus: AiPricingStatus;
    estimatedInputCostUsd: number | null;
    estimatedOutputCostUsd: number | null;
    estimatedCostUsd: number | null;
    pricingSnapshot: AiPricingSnapshot | null;
}
