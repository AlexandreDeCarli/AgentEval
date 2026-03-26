export interface ApiConfig {
    post_url: string;
    get_url: string;
    auth_header: string;
    payload_template: string;
    response_path: string;
    polling_interval: number;
    max_timeout: number;
}

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
    system_prompts: SystemPrompt[];
    environments: Environment[];
}

export interface Mission {
    id: string;
    project_id?: string;
    environment_id?: string;
    system_prompt_id?: string;
    titulo: string;
    target_system_prompt: string;
    tester_persona: string;
    mission_goal: string;
    variables: Record<string, any[]>;
    max_turns: number;
    api_config: ApiConfig;
    evaluation_criteria?: EvaluationCriterion[];
}

export interface ChatMessage {
    id: string;
    role: 'tester' | 'target' | 'system';
    content: string;
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
    timestamp: number;
    type: 'request' | 'response' | 'error' | 'info';
    label: string;
    data: string;
}

export interface TestRun {
    id: string;
    mission_id: string;
    status: 'running' | 'success' | 'failed';
    chat_history: ChatMessage[];
    evaluation: Evaluation | null;
    resolved_variables: Record<string, any>;
    debug_logs: DebugLogEntry[];
    created_at: number;
    updated_at: number;
    error?: string;
}
