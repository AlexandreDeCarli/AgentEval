export interface EvaluationLanguageOption {
    id: string;
    name: string;
    nativeName: string;
}

export const EVALUATION_LANGUAGES: EvaluationLanguageOption[] = [
    { id: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)' },
    { id: 'en-US', name: 'English (US)', nativeName: 'English (US)' },
    { id: 'es-ES', name: 'Spanish', nativeName: 'Español' },
    { id: 'fr-FR', name: 'French', nativeName: 'Français' },
    { id: 'de-DE', name: 'German', nativeName: 'Deutsch' },
    { id: 'it-IT', name: 'Italian', nativeName: 'Italiano' },
];

export const DEFAULT_EVALUATION_LANGUAGE = 'pt-BR';

export const getEvaluationLanguageInstruction = (lang?: string): string => {
    const normalized = (lang || DEFAULT_EVALUATION_LANGUAGE).trim();

    switch (normalized) {
        case 'en-US':
        case 'en':
            return 'CRITICAL LANGUAGE REQUIREMENT: You MUST write all textual fields in the evaluation output (including "summary", all criterion "justification", and all "prompt_improvements" fields such as "suggested_text" and "justification") strictly in ENGLISH.';
        case 'es-ES':
        case 'es':
            return 'CRITICAL LANGUAGE REQUIREMENT: You MUST write all textual fields in the evaluation output (including "summary", all criterion "justification", and all "prompt_improvements" fields such as "suggested_text" and "justification") strictly in SPANISH (Español).';
        case 'fr-FR':
        case 'fr':
            return 'CRITICAL LANGUAGE REQUIREMENT: You MUST write all textual fields in the evaluation output (including "summary", all criterion "justification", and all "prompt_improvements" fields such as "suggested_text" and "justification") strictly in FRENCH (Français).';
        case 'de-DE':
        case 'de':
            return 'CRITICAL LANGUAGE REQUIREMENT: You MUST write all textual fields in the evaluation output (including "summary", all criterion "justification", and all "prompt_improvements" fields such as "suggested_text" and "justification") strictly in GERMAN (Deutsch).';
        case 'it-IT':
        case 'it':
            return 'CRITICAL LANGUAGE REQUIREMENT: You MUST write all textual fields in the evaluation output (including "summary", all criterion "justification", and all "prompt_improvements" fields such as "suggested_text" and "justification") strictly in ITALIAN (Italiano).';
        case 'pt-BR':
        case 'pt':
            return 'CRITICAL LANGUAGE REQUIREMENT: You MUST write all textual fields in the evaluation output (including "summary", all criterion "justification", and all "prompt_improvements" fields such as "suggested_text" and "justification") strictly in PORTUGUESE (Português do Brasil - pt-BR). Even if the agent conversation or system prompt is in English or another language, your evaluation analysis, explanations, justifications, and suggestions MUST be in Portuguese (pt-BR).';
        default:
            return `CRITICAL LANGUAGE REQUIREMENT: You MUST write all textual fields in the evaluation output (including "summary", all criterion "justification", and all "prompt_improvements" fields such as "suggested_text" and "justification") strictly in ${normalized}. Even if the agent conversation or system prompt is in English or another language, your evaluation analysis, explanations, justifications, and suggestions MUST be in ${normalized}.`;
    }
};
