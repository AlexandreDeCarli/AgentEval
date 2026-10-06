export interface TestRunFilters {
    query: string;
    projectId: string;
    status: 'all' | 'success' | 'failed';
    environmentId: string;
}

export const DEFAULT_TEST_RUN_FILTERS: TestRunFilters = {
    query: '',
    projectId: 'all',
    status: 'all',
    environmentId: 'all',
};
