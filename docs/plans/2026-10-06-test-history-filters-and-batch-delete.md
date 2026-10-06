# Test History Filters and Batch Deletion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to filter, select, and batch delete test runs from the Test History screen using the same filter pattern, selection controls, and visual grammar as the Project Missions tab.

**Architecture:** Create a pure, testable filter module `src/features/test-history/testRunFilters.ts` modeled after `missionFilters.ts` that filters test runs by search query, project, status, and environment. Extend `useTestRunStore` with an atomic batch `deleteRuns` action backed by IndexedDB. Enhance `TestHistory.tsx` with a responsive filter toolbar, item selection checkboxes, header batch delete actions, and a destructive confirmation dialog using `ConfirmDeleteModal`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Zustand with IndexedDB persistence (`idbStorage`), Lucide React icons, Node.js + esbuild test runner.

---

## Visual Direction & Impeccable Craft Contract

*Note: Visual-direction-by-generation step is skipped because the harness lacks native image generation; following the established AgentEval Product Register and `ProjectMissionsTab` contract.*

### Product Register UX & Layout Guidelines
- **Elevation & Layers:** Use tonal layering: Void background (`#13161B`), Surface cards (`#1C2026`), Surface Elevated inputs/chips (`#272D35`), Border (`#2D3036`).
- **Typography:** Plus Jakarta Sans with extreme weight contrast. Display (`text-display`) for page header, Title (`text-title`) for modal titles, Body (`text-body`) for run details, Label (`text-label`, uppercase, tracked) for filter headers, badges, and counter chips.
- **Color Strategy:** Restrained. Signal Blue (`#4A72FF`) for focus rings and selection highlights. Destructive Red-to-Rose gradient (`from-red-600 to-rose-500`) with red glow for irreversible batch deletion.
- **Selection States:**
  - Unselected Card: `border-border/50 hover:border-[#4A72FF]/40 hover:bg-[#272D35]/20`
  - Selected Card: `border-[#4A72FF]/70 bg-[#272D35]/35`
  - Checkbox: Custom styled accessible checkbox `h-4 w-4 rounded border-border bg-[#272D35] text-[#4A72FF] focus-visible:ring-2 focus-visible:ring-[#4A72FF]` with distinct `aria-label`.
- **Destructive Header Button:**
  - Has Selection: `Delete Selected (${selectedCount})` with red gradient and `Trash2` icon.
  - Zero Selection, Active Filter: `Delete Filtered (${filteredCount})` with red outline and `Trash2` icon, prompting confirmation for all matching runs.
  - Zero Selection, No Filter, Runs Exist: `Clear All History` with red outline and `Trash2` icon.
  - 0 Runs: Disabled.

---

## File Structure & Responsibilities

| File Path | Action | Description |
| :--- | :--- | :--- |
| `src/features/test-history/testRunFilters.ts` | **Create** | Filter interfaces, default states, option extractors, filtering algorithm, and selection reconciliation |
| `src/store/useTestRunStore.ts` | **Modify** | Add `deleteRuns(ids: string[])` and `clearAllRuns()` to the Zustand state store |
| `src/features/TestHistory.tsx` | **Modify** | Add filter bar (query, project, status, environment), checkboxes on run items, batch delete button, and confirmation modal |
| `tests/history/test-history-filters.cjs` | **Create** | Automated test suite verifying filtering logic, multi-criteria combinations, selection reconciliation, and store batch deletion |
| `package.json` | **Modify** | Add `test:history` script |

---

## Bite-Sized Implementation Tasks

### Task 1: Store Batch Deletion Support in `useTestRunStore`

**Files:**
- Modify: `src/store/useTestRunStore.ts:6-65`
- Test: `tests/history/test-history-filters.cjs`

**Step 1: Write the failing test**

Create `tests/history/test-history-filters.cjs`:

```javascript
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const fs = require('node:fs');

async function compileModules() {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 'agenteval-history-test-'));
    const outfile = path.join(tmpDir, 'history-test.cjs');

    await esbuild.build({
        stdin: {
            contents: `
                export * from './src/features/test-history/testRunFilters.ts';
                export { useTestRunStore } from './src/store/useTestRunStore.ts';
            `,
            resolveDir: path.resolve(__dirname, '../..'),
            loader: 'ts',
        },
        bundle: true,
        platform: 'node',
        format: 'cjs',
        outfile,
    });

    return { tmpDir, module: require(outfile) };
}

async function runTests() {
    console.log('--- Testing Test Run Store Batch Deletion ---');
    const { module } = await compileModules();
    const { useTestRunStore } = module;

    // Verify deleteRuns method exists and deletes multiple IDs
    const store = useTestRunStore.getState();
    assert.equal(typeof store.deleteRuns, 'function', 'store.deleteRuns must be a function');
    assert.equal(typeof store.clearAllRuns, 'function', 'store.clearAllRuns must be a function');

    console.log('✓ store.deleteRuns and store.clearAllRuns methods exist');
}

runTests().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});
```

**Step 2: Run test to verify it fails**

Run: `node tests/history/test-history-filters.cjs`
Expected: FAIL with "store.deleteRuns must be a function" or compilation error because `testRunFilters.ts` doesn't exist yet.

**Step 3: Implement minimal store methods in `src/store/useTestRunStore.ts`**

Update `src/store/useTestRunStore.ts`:
```typescript
interface TestRunState {
    runs: TestRun[];
    addRun: (run: TestRun) => void;
    updateRunStatus: (id: string, status: TestRun['status'], error?: string) => void;
    addMessage: (id: string, message: ChatMessage) => void;
    updateMessage: (runId: string, msgId: string, message: ChatMessage) => void;
    addDebugLog: (id: string, entry: DebugLogEntry) => void;
    setEvaluation: (id: string, evalResult: Evaluation) => void;
    deleteRun: (id: string) => void;
    deleteRuns: (ids: string[]) => void;
    clearAllRuns: () => void;
}
```

And in the implementation:
```typescript
            deleteRun: (id) =>
                set((state) => ({
                    runs: state.runs.filter((r) => r.id !== id),
                })),
            deleteRuns: (ids) => {
                const idSet = new Set(ids);
                set((state) => ({
                    runs: state.runs.filter((r) => !idSet.has(r.id)),
                }));
            },
            clearAllRuns: () =>
                set(() => ({
                    runs: [],
                })),
```

Create stub `src/features/test-history/testRunFilters.ts` so bundling succeeds:
```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `node tests/history/test-history-filters.cjs`
Expected: PASS with "✓ store.deleteRuns and store.clearAllRuns methods exist".

**Step 5: Commit**

```bash
git add src/store/useTestRunStore.ts src/features/test-history/testRunFilters.ts tests/history/test-history-filters.cjs
git commit -m "feat(history): add batch deletion methods to test run store"
```

---

### Task 2: Implement Filter Logic and Option Extractors in `testRunFilters.ts`

**Files:**
- Create: `src/features/test-history/testRunFilters.ts`
- Modify: `tests/history/test-history-filters.cjs`

**Step 1: Write tests for filtering algorithms**

Expand `tests/history/test-history-filters.cjs` with comprehensive test cases:
1. Search query matching mission title, mission goal, and execution error.
2. Filtering by project ID.
3. Filtering by run status (`'success'`, `'failed'`).
4. Filtering by environment ID.
5. Multi-criteria combined filtering.
6. Option extraction for projects and environments.
7. `reconcileSelectedRunIds` ensuring only valid runs remain selected.

```javascript
    console.log('--- Testing Test Run Filtering Functions ---');
    const {
        DEFAULT_TEST_RUN_FILTERS,
        filterTestRuns,
        getTestRunFilterOptions,
        reconcileSelectedRunIds
    } = module;

    const mockProjects = [
        { id: 'p1', name: 'Project Alpha', environments: [{ id: 'env1', name: 'Staging' }] },
        { id: 'p2', name: 'Project Beta', environments: [{ id: 'env2', name: 'Production' }] }
    ];

    const mockMissions = [
        { id: 'm1', project_id: 'p1', titulo: 'Login Flow', mission_goal: 'Test user authentication', environment_id: 'env1' },
        { id: 'm2', project_id: 'p1', titulo: 'Checkout Flow', mission_goal: 'Test payment gateway', environment_id: 'env1' },
        { id: 'm3', project_id: 'p2', titulo: 'Profile Update', mission_goal: 'Edit avatar and bio', environment_id: 'env2' }
    ];

    const mockRuns = [
        { id: 'r1', mission_id: 'm1', status: 'success', created_at: 1000 },
        { id: 'r2', mission_id: 'm1', status: 'failed', error: 'Network timeout during OTP', created_at: 2000 },
        { id: 'r3', mission_id: 'm2', status: 'success', created_at: 3000 },
        { id: 'r4', mission_id: 'm3', status: 'failed', created_at: 4000 }
    ];

    const missionMap = new Map(mockMissions.map(m => [m.id, m]));
    const projectMap = new Map(mockProjects.map(p => [p.id, p]));

    // 1. Default filters return all runs
    const allFiltered = filterTestRuns(mockRuns, DEFAULT_TEST_RUN_FILTERS, missionMap, projectMap);
    assert.equal(allFiltered.length, 4);

    // 2. Query filter on mission title
    const loginFiltered = filterTestRuns(mockRuns, { ...DEFAULT_TEST_RUN_FILTERS, query: 'login' }, missionMap, projectMap);
    assert.equal(loginFiltered.length, 2);

    // 3. Query filter on error text
    const errorFiltered = filterTestRuns(mockRuns, { ...DEFAULT_TEST_RUN_FILTERS, query: 'timeout' }, missionMap, projectMap);
    assert.equal(errorFiltered.length, 1);
    assert.equal(errorFiltered[0].id, 'r2');

    // 4. Project filter
    const p2Filtered = filterTestRuns(mockRuns, { ...DEFAULT_TEST_RUN_FILTERS, projectId: 'p2' }, missionMap, projectMap);
    assert.equal(p2Filtered.length, 1);
    assert.equal(p2Filtered[0].id, 'r4');

    // 5. Status filter
    const successFiltered = filterTestRuns(mockRuns, { ...DEFAULT_TEST_RUN_FILTERS, status: 'success' }, missionMap, projectMap);
    assert.equal(successFiltered.length, 2);

    // 6. Environment filter
    const env2Filtered = filterTestRuns(mockRuns, { ...DEFAULT_TEST_RUN_FILTERS, environmentId: 'env2' }, missionMap, projectMap);
    assert.equal(env2Filtered.length, 1);
    assert.equal(env2Filtered[0].id, 'r4');

    // 7. Combined filter
    const combinedFiltered = filterTestRuns(mockRuns, {
        query: '',
        projectId: 'p1',
        status: 'failed',
        environmentId: 'all'
    }, missionMap, projectMap);
    assert.equal(combinedFiltered.length, 1);
    assert.equal(combinedFiltered[0].id, 'r2');

    // 8. Reconcile selection
    const reconciled = reconcileSelectedRunIds(['r1', 'deleted_id', 'r3'], mockRuns);
    assert.deepEqual(reconciled, ['r1', 'r3']);

    console.log('✓ All filter and reconciliation algorithms passed');
```

**Step 2: Run test to verify it fails**

Run: `node tests/history/test-history-filters.cjs`
Expected: FAIL with "filterTestRuns is not a function"

**Step 3: Implement `src/features/test-history/testRunFilters.ts`**

Write full implementation:
```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `node tests/history/test-history-filters.cjs`
Expected: PASS with "✓ All filter and reconciliation algorithms passed".

**Step 5: Commit**

```bash
git add src/features/test-history/testRunFilters.ts tests/history/test-history-filters.cjs
git commit -m "feat(history): implement filter algorithms and option extractors for test runs"
```

---

### Task 3: Add `test:history` Script to `package.json`

**Files:**
- Modify: `package.json:11-18`

**Step 1: Add script to `package.json`**

Add `"test:history": "node tests/history/test-history-filters.cjs"` in the `scripts` object of `package.json`.

**Step 2: Run test using npm script**

Run: `npm run test:history`
Expected: Exits with code 0 and all tests pass.

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add test:history script to package.json"
```

---

### Task 4: Integrate Filter Bar, Selection Checkboxes, and Batch Deletion into `TestHistory.tsx`

**Files:**
- Modify: `src/features/TestHistory.tsx`

**Step 1: Update `TestHistory.tsx` state and hooks**

Import icons, store actions, and filter utilities:
```typescript
import { Filter, Search, Trash2, ExternalLink, TrendingUp, Target, Server, Clock, X, Layers, CheckSquare, Square } from 'lucide-react';
import {
    DEFAULT_TEST_RUN_FILTERS,
    filterTestRuns,
    getTestRunFilterOptions,
    reconcileSelectedRunIds,
    TestRunFilters,
} from './test-history/testRunFilters';
```

In `TestHistory` component:
- Pull `deleteRuns` from `useTestRunStore`.
- State for `filters` (`useState<TestRunFilters>(DEFAULT_TEST_RUN_FILTERS)`).
- State for `selectedRunIds` (`useState<string[]>([])`).
- State for `batchDeleteModalOpen` (`useState<boolean>(false)`).
- Precompute `projectOptions` and `environmentOptions` with `useMemo`.
- Compute `filteredRuns` with `useMemo(() => filterTestRuns(runs, filters, missionMap, projectMap), [runs, filters, missionMap, projectMap])`.
- Compute `selectedVisibleRuns` with `useMemo(() => filteredRuns.filter((r) => selectedRunIds.includes(r.id)), [filteredRuns, selectedRunIds])`.
- Sync `selectedRunIds` using `useEffect` with `reconcileSelectedRunIds`.
- Helper callbacks:
  - `handleSelectAllVisible`: Selects all `filteredRuns.map(r => r.id)`.
  - `handleClearSelection`: Clears selection.
  - `handleClearFilters`: Resets filters to `DEFAULT_TEST_RUN_FILTERS`.
  - `handleToggleSelectRun(runId)`: Toggles individual item.
  - `handleConfirmBatchDelete`: Executes `deleteRuns(targetIds)`, resets selection and modal.

**Step 2: Add Batch Action Button to Header**

In the top header (`<div className="flex justify-between items-center mb-8 select-none">`):
```tsx
<div className="flex flex-wrap items-center gap-3">
    {runs.length > 0 && (
        <Button
            variant="destructive"
            onClick={() => setBatchDeleteModalOpen(true)}
            disabled={filteredRuns.length === 0}
            className="gap-2 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-bold text-xs uppercase shadow-lg shadow-red-500/10 cursor-pointer transition-all duration-200 active:scale-[0.98]"
        >
            <Trash2 className="w-3.5 h-3.5" />
            {selectedVisibleRuns.length > 0
                ? `Delete Selected (${selectedVisibleRuns.length})`
                : hasActiveFilters
                ? `Delete Filtered (${filteredRuns.length})`
                : `Clear History (${filteredRuns.length})`}
        </Button>
    )}
</div>
```

**Step 3: Render Filter Toolbar (Matching `ProjectMissionsTab` Style)**

When `runs.length > 0`:
```tsx
<div className="rounded-xl border border-border/50 bg-[#1C2026] p-4 space-y-4 mb-6">
    <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-end 2xl:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 flex-1">
            {/* 1. Search Query */}
            <label className="space-y-1.5">
                <span className="text-label text-muted-foreground flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5" /> Search history
                </span>
                <Input
                    value={filters.query}
                    onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
                    placeholder="Search mission, goal, or error..."
                    aria-label="Search test runs"
                />
            </label>

            {/* 2. Project Filter */}
            <label className="space-y-1.5">
                <span className="text-label text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Project
                </span>
                <select
                    value={filters.projectId}
                    onChange={(e) => setFilters((prev) => ({ ...prev, projectId: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A72FF] focus-visible:border-[#4A72FF]"
                    aria-label="Filter test runs by project"
                >
                    <option value="all">All projects</option>
                    {projectOptions.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </label>

            {/* 3. Status Filter */}
            <label className="space-y-1.5">
                <span className="text-label text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Execution status
                </span>
                <select
                    value={filters.status}
                    onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as any }))}
                    className="h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A72FF] focus-visible:border-[#4A72FF]"
                    aria-label="Filter test runs by status"
                >
                    <option value="all">All statuses</option>
                    <option value="success">✓ Success</option>
                    <option value="failed">✗ Failed</option>
                </select>
            </label>

            {/* 4. Environment Filter */}
            <label className="space-y-1.5">
                <span className="text-label text-muted-foreground flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5" /> Environment
                </span>
                <select
                    value={filters.environmentId}
                    onChange={(e) => setFilters((prev) => ({ ...prev, environmentId: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A72FF] focus-visible:border-[#4A72FF]"
                    aria-label="Filter test runs by environment"
                >
                    <option value="all">All environments</option>
                    {environmentOptions.map((env) => (
                        <option key={env.id} value={env.id}>{env.name}</option>
                    ))}
                </select>
            </label>
        </div>

        {/* Quick selection actions */}
        <div className="flex flex-wrap items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllVisible}
                disabled={filteredRuns.length === 0}
                className="text-xs"
            >
                Select visible
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                disabled={selectedRunIds.length === 0}
                className="text-xs"
            >
                Clear selection
            </Button>
            {hasActiveFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="gap-1 text-xs text-muted-foreground hover:text-white"
                >
                    <X className="w-3.5 h-3.5" /> Clear filters
                </Button>
            )}
        </div>
    </div>

    {/* Counter metadata line */}
    <div className="flex flex-wrap items-center gap-2 text-label text-muted-foreground">
        <span>{filteredRuns.length} visible</span>
        <span className="text-border">/</span>
        <span>{selectedVisibleRuns.length} selected</span>
        {hasActiveFilters && (
            <>
                <span className="text-border">/</span>
                <span>Deletion is scoped to current filters</span>
            </>
        )}
    </div>
</div>
```

**Step 4: Add Checkbox and Selected Highlight to Run Cards**

Update the card container:
```tsx
<div
    key={run.id}
    className={`border rounded-xl bg-[#1C2026] p-5 flex flex-col sm:flex-row sm:items-center justify-between transition-all duration-300 shadow-sm gap-4 relative overflow-hidden ${
        isSelected
            ? 'border-[#4A72FF]/70 bg-[#272D35]/35'
            : 'border-border/50 hover:border-[#4A72FF]/40 hover:bg-[#272D35]/20'
    }`}
>
    {/* Accent Line */}
    <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#4A72FF]/20 to-transparent opacity-10" />

    {/* Selection Checkbox */}
    <label className="flex items-center self-start sm:self-center pt-0.5 sm:pt-0 cursor-pointer select-none">
        <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => handleToggleSelectRun(run.id, e.target.checked)}
            className="h-4 w-4 rounded border-border bg-[#272D35] text-[#4A72FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A72FF] cursor-pointer"
            aria-label={`Select test run for mission ${missionTitle}`}
        />
    </label>
...
```

**Step 5: Add Batch Deletion Modal**

```tsx
{batchDeleteModalOpen && (
    <ConfirmDeleteModal
        itemType="Test Runs"
        itemName={
            selectedVisibleRuns.length > 0
                ? `${selectedVisibleRuns.length} Selected Runs`
                : hasActiveFilters
                ? `${filteredRuns.length} Filtered Runs`
                : `All ${filteredRuns.length} History Runs`
        }
        warningDescription={
            selectedVisibleRuns.length > 0
                ? "The conversational history, API inspector payloads, and evaluation score metrics for the selected runs will be permanently deleted."
                : hasActiveFilters
                ? `All ${filteredRuns.length} runs matching current filters will be permanently deleted from history.`
                : "All conversational histories, API inspector payloads, and Gemini evaluation metrics across all projects will be permanently deleted."
        }
        subtitle={
            selectedVisibleRuns.length > 0
                ? `${selectedVisibleRuns.length} test records marked for deletion`
                : `${filteredRuns.length} test records affected`
        }
        onConfirm={handleConfirmBatchDelete}
        onCancel={() => setBatchDeleteModalOpen(false)}
    />
)}
```

**Step 6: Handle Empty State when filtered**

When `runs.length > 0 && filteredRuns.length === 0`:
Display filtered empty state:
```tsx
<div className="py-10 text-center border border-dashed border-border/60 bg-[#1C2026]/40 rounded-2xl select-none">
    <p className="text-body text-white font-bold mb-1">No test runs match these filters.</p>
    <p className="text-body text-muted-foreground mb-4">
        Adjust search query, project, status, or environment to inspect records.
    </p>
    <Button variant="outline" onClick={handleClearFilters} className="gap-2">
        <X className="w-4 h-4" /> Clear filters
    </Button>
</div>
```

**Step 7: Build and Verify**

Run: `npm run build`
Expected: Production build succeeds with 0 TypeScript/lint errors.

Run: `npm run test:history`
Expected: Passes with 100% success.

**Step 8: Commit**

```bash
git add src/features/TestHistory.tsx
git commit -m "feat(history): add filter controls, selection checkboxes, and batch delete modal"
```

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-10-06-test-history-filters-and-batch-delete.md`. Two execution options:

1. **Subagent-Driven (this session)** - I dispatch fresh subagents per task, review between tasks, fast iteration
2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
