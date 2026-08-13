import { Mission, Project, TargetProvider } from '../types';

export const DEFAULT_GEMINI_TARGET_MODEL = 'gemini-2.5-flash';

export const SUGGESTED_GEMINI_TARGET_MODELS = [
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-pro-preview',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
];

export const getMissionTargetProvider = (
    mission?: Pick<Mission, 'target_provider'>
): TargetProvider => {
    return mission?.target_provider === 'gemini' ? 'gemini' : 'http';
};

export const getMissionGeminiModel = (
    mission?: Pick<Mission, 'target_gemini_model'>
): string => {
    return mission?.target_gemini_model?.trim() || DEFAULT_GEMINI_TARGET_MODEL;
};

export const getProjectTargetProvider = (
    project?: Pick<Project, 'target_provider'> | null,
    fallbackMission?: Pick<Mission, 'target_provider'> | null
): TargetProvider => {
    if (project?.target_provider === 'gemini') {
        return 'gemini';
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

export const normalizeProjectTargetConfig = <
    T extends Pick<Project, 'target_provider' | 'target_gemini_model'>
>(
    project: T
): T & { target_provider: TargetProvider; target_gemini_model: string } => ({
    ...project,
    target_provider: getProjectTargetProvider(project),
    target_gemini_model: getProjectGeminiModel(project),
});
