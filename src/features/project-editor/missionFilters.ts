import { Mission, Project } from '../../types';

export interface MissionFilters {
    query: string;
    environmentId: string;
    systemPromptId: string;
}

export interface FilterOption {
    id: string;
    name: string;
}

export const DEFAULT_MISSION_FILTERS: MissionFilters = {
    query: '',
    environmentId: 'all',
    systemPromptId: 'all',
};

const normalizeSearchValue = (value: string | undefined) =>
    (value || '').trim().toLocaleLowerCase();

export const getMissionFilterOptions = (project: Project) => ({
    environmentOptions: project.environments.map((environment) => ({
        id: environment.id,
        name: environment.name,
    })),
    systemPromptOptions: project.system_prompts.map((prompt) => ({
        id: prompt.id,
        name: prompt.name,
    })),
});

export const filterProjectMissions = (
    missions: Mission[],
    filters: MissionFilters
): Mission[] => {
    const query = normalizeSearchValue(filters.query);

    return missions.filter((mission) => {
        const matchesQuery =
            !query ||
            normalizeSearchValue(mission.titulo).includes(query) ||
            normalizeSearchValue(mission.mission_goal).includes(query);
        const matchesEnvironment =
            filters.environmentId === 'all' ||
            mission.environment_id === filters.environmentId;
        const matchesSystemPrompt =
            filters.systemPromptId === 'all' ||
            mission.system_prompt_id === filters.systemPromptId;

        return matchesQuery && matchesEnvironment && matchesSystemPrompt;
    });
};

export const reconcileSelectedMissionIds = (
    selectedIds: string[],
    visibleMissions: Mission[]
): string[] => {
    const visibleMissionIds = new Set(visibleMissions.map((mission) => mission.id));
    return selectedIds.filter((missionId) => visibleMissionIds.has(missionId));
};
