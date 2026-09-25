import { GeminiModelInfo, GEMINI_MODELS, getCombinedSuggestedTargetModels } from '../config/geminiModels';
import { Mission, Project, TargetProvider } from '../types';

export const DEFAULT_GEMINI_TARGET_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_LITELLM_TARGET_MODEL = 'gpt-4o-mini';

export const SUGGESTED_GEMINI_TARGET_MODELS = GEMINI_MODELS.map((m) => m.id);

export const getSuggestedGeminiTargetModels = (
    discoveredModels?: GeminiModelInfo[]
): string[] => getCombinedSuggestedTargetModels(discoveredModels);

export const getMissionTargetProvider = (
    mission?: Pick<Mission, 'target_provider'>
): TargetProvider => {
    if (mission?.target_provider === 'gemini') return 'gemini';
    if (mission?.target_provider === 'litellm') return 'litellm';
    return 'http';
};

export const getMissionGeminiModel = (
    mission?: Pick<Mission, 'target_gemini_model'>
): string => {
    return mission?.target_gemini_model?.trim() || DEFAULT_GEMINI_TARGET_MODEL;
};

export const getMissionLiteLlmModel = (
    mission?: Pick<Mission, 'target_litellm_model'>
): string => {
    return mission?.target_litellm_model?.trim() || DEFAULT_LITELLM_TARGET_MODEL;
};

export const getProjectTargetProvider = (
    project?: Pick<Project, 'target_provider'> | null,
    fallbackMission?: Pick<Mission, 'target_provider'> | null
): TargetProvider => {
    if (project?.target_provider === 'gemini') {
        return 'gemini';
    }
    if (project?.target_provider === 'litellm') {
        return 'litellm';
    }
    if (project?.target_provider === 'http') {
        return 'http';
    }

    return getMissionTargetProvider(fallbackMission || undefined);
};

export const getProjectGeminiModel = (
    project?: Pick<Project, 'target_provider' | 'target_gemini_model'> | null,
    fallbackMission?: Pick<Mission, 'target_gemini_model'> | null
): string => {
    if (project?.target_gemini_model?.trim()) {
        return project.target_gemini_model.trim();
    }
    if (project?.target_provider) {
        return DEFAULT_GEMINI_TARGET_MODEL;
    }

    return (
        fallbackMission?.target_gemini_model?.trim() ||
        DEFAULT_GEMINI_TARGET_MODEL
    );
};

export const getProjectLiteLlmModel = (
    project?: Pick<Project, 'target_provider' | 'target_litellm_model'> | null,
    fallbackMission?: Pick<Mission, 'target_litellm_model'> | null
): string => {
    if (project?.target_litellm_model?.trim()) {
        return project.target_litellm_model.trim();
    }
    if (project?.target_provider === 'litellm') {
        return DEFAULT_LITELLM_TARGET_MODEL;
    }

    return (
        fallbackMission?.target_litellm_model?.trim() ||
        DEFAULT_LITELLM_TARGET_MODEL
    );
};

export const normalizeProjectTargetConfig = <
    T extends Pick<Project, 'target_provider' | 'target_gemini_model' | 'target_litellm_model'>
>(
    project: T
): T & { target_provider: TargetProvider; target_gemini_model: string; target_litellm_model: string } => ({
    ...project,
    target_provider: getProjectTargetProvider(project),
    target_gemini_model: getProjectGeminiModel(project),
    target_litellm_model: getProjectLiteLlmModel(project),
});
