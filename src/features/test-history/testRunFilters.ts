import { TestRun, Mission, Project } from '../../types';

export interface TestRunFilters {
    query: string;
    projectId: string;
    status: 'all' | 'success' | 'failed';
    environmentId: string;
}

export interface FilterOption {
    id: string;
    name: string;
}

export const DEFAULT_TEST_RUN_FILTERS: TestRunFilters = {
    query: '',
    projectId: 'all',
    status: 'all',
    environmentId: 'all',
};

const normalizeSearchValue = (value: string | undefined): string =>
    (value || '').trim().toLocaleLowerCase();

export const getTestRunFilterOptions = (projects: Project[]) => {
    const projectOptions: FilterOption[] = projects.map((p) => ({
        id: p.id,
        name: p.name,
    }));

    const environmentOptions: FilterOption[] = [];
    const seenEnvIds = new Set<string>();

    for (const project of projects) {
        for (const env of project.environments || []) {
            if (!seenEnvIds.has(env.id)) {
                seenEnvIds.add(env.id);
                environmentOptions.push({
                    id: env.id,
                    name: `${env.name} (${project.name})`,
                });
            }
        }
    }

    return {
        projectOptions,
        environmentOptions,
    };
};

export const filterTestRuns = (
    runs: TestRun[],
    filters: TestRunFilters,
    missionMap: Map<string, Mission>,
    projectMap: Map<string, Project>
): TestRun[] => {
    const query = normalizeSearchValue(filters.query);

    return runs.filter((run) => {
        const mission = missionMap.get(run.mission_id);
        const project = mission && mission.project_id ? projectMap.get(mission.project_id) : undefined;

        // 1. Text Search matching mission title, mission goal, error message, or project name
        const matchesQuery =
            !query ||
            normalizeSearchValue(mission?.titulo).includes(query) ||
            normalizeSearchValue(mission?.mission_goal).includes(query) ||
            normalizeSearchValue(run.error).includes(query) ||
            normalizeSearchValue(project?.name).includes(query);

        // 2. Project Filter
        const matchesProject =
            filters.projectId === 'all' ||
            (mission && mission.project_id === filters.projectId);

        // 3. Status Filter
        const matchesStatus =
            filters.status === 'all' ||
            run.status === filters.status;

        // 4. Environment Filter
        const matchesEnvironment =
            filters.environmentId === 'all' ||
            (mission && mission.environment_id === filters.environmentId);

        return matchesQuery && matchesProject && matchesStatus && matchesEnvironment;
    });
};

export const reconcileSelectedRunIds = (
    selectedIds: string[],
    allRuns: TestRun[]
): string[] => {
    const runIdSet = new Set(allRuns.map((r) => r.id));
    return selectedIds.filter((id) => runIdSet.has(id));
};
