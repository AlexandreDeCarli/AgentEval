# Project Mission Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add mission filters inside the project missions tab and scope batch execution to filtered or selected missions.

**Architecture:** Filtering is isolated in a pure TypeScript helper, while `ProjectMissionsTab` owns filter and checkbox state. `ProjectEditor` remains responsible for starting executions and receives the exact mission batch to run.

**Tech Stack:** React 18, TypeScript, Vite 5, Tailwind CSS v4, Zustand, Lucide React, Playwright.

## Global Constraints

- Preserve the existing AgentEval dark product UI and compact control vocabulary.
- Batch `Run All` must run only currently filtered missions.
- When at least one visible mission is checked, the batch button must become `Run Selected` and run only checked missions.
- Filters must include mission search, environment, and selected system prompt.
- Checkbox must appear on the left side of each project mission card.
- Keep single mission `Run`, `Edit`, `Delete`, and global Mission Board behavior intact.
- Do not edit unrelated dirty files from the original checkout.

---

## File Structure

- Create `src/features/project-editor/missionFilters.ts`: pure filter and selection helpers.
- Modify `src/components/MissionCard.tsx`: optional selection props and left checkbox.
- Modify `src/features/project-editor/components/ProjectMissionsTab.tsx`: filter toolbar, selected state, filtered empty state, batch button labels.
- Modify `src/features/ProjectEditor.tsx`: execute the mission list passed by the tab.
- Create `scratch/test-project-mission-filters.cjs`: focused browser regression.

---

### Task 1: Mission Filter Helper

**Files:**
- Create: `src/features/project-editor/missionFilters.ts`
- Test: `npm run build` equivalent using local Node runtime.

**Interfaces:**
- Consumes: `Mission`, `Project`.
- Produces: `MissionFilters`, `DEFAULT_MISSION_FILTERS`, `getMissionFilterOptions(project)`, `filterProjectMissions(missions, filters)`, `reconcileSelectedMissionIds(selectedIds, allMissions)`.

- [x] **Step 1: Write helper with exact API**

```ts
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
    environmentOptions: (project.environments || []).map((environment) => ({
        id: environment.id,
        name: environment.name,
    })),
    systemPromptOptions: (project.system_prompts || []).map((prompt) => ({
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
    allMissions: Mission[]
): string[] => {
    const missionIds = new Set(allMissions.map((mission) => mission.id));
    return selectedIds.filter((missionId) => missionIds.has(missionId));
};
```

- [x] **Step 2: Verify build reaches this file without TypeScript errors**

Run: `npm run build`

Expected: exit `0`.

---

### Task 2: Selectable Mission Cards

**Files:**
- Modify: `src/components/MissionCard.tsx`
- Test: TypeScript build.

**Interfaces:**
- Produces optional props `isSelected?: boolean`, `onSelectionChange?: (missionId: string, selected: boolean) => void`, `selectionLabel?: string`.

- [x] **Step 1: Extend props and destructuring**

```ts
import { Mission, TestRun } from '../types';

interface MissionCardProps {
    mission: Mission;
    onDelete: (mission: Mission) => void;
    onClone?: (mission: Mission) => void;
    onSelectRun?: (run: TestRun) => void;
    isSelected?: boolean;
    onSelectionChange?: (missionId: string, selected: boolean) => void;
    selectionLabel?: string;
}
```

- [x] **Step 2: Render left checkbox only when selection is enabled**

```tsx
{onSelectionChange && (
    <label className="flex items-center self-start sm:self-center pt-0.5 sm:pt-0 cursor-pointer select-none">
        <input
            type="checkbox"
            checked={isSelected}
            onChange={(event) => onSelectionChange(mission.id, event.target.checked)}
            className="h-4 w-4 rounded border-border bg-[#272D35] text-[#4A72FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A72FF] cursor-pointer"
            aria-label={selectionLabel || `Select mission ${mission.titulo}`}
        />
    </label>
)}
```

- [x] **Step 3: Add selected styling to the root card**

Use `border-[#4A72FF]/70 bg-[#272D35]/35` when `isSelected` is true; otherwise preserve the current hover styles.

- [x] **Step 4: Verify**

Run: `npm run build`

Expected: exit `0`.

---

### Task 3: Project Mission Filters and Selection UI

**Files:**
- Modify: `src/features/project-editor/components/ProjectMissionsTab.tsx`
- Test: TypeScript build.

**Interfaces:**
- Consumes helper functions from Task 1 and selection props from Task 2.
- Changes `onRunAll` to `(missions: Mission[]) => void`.

- [x] **Step 1: Add state and derived mission lists**

```tsx
const [filters, setFilters] = useState(DEFAULT_MISSION_FILTERS);
const [selectedMissionIds, setSelectedMissionIds] = useState<string[]>([]);
const { environmentOptions, systemPromptOptions } = useMemo(
    () => getMissionFilterOptions(project),
    [project]
);
const filteredMissions = useMemo(
    () => filterProjectMissions(projectMissions, filters),
    [projectMissions, filters]
);
const selectedVisibleMissions = useMemo(
    () => filteredMissions.filter((mission) => selectedMissionIds.includes(mission.id)),
    [filteredMissions, selectedMissionIds]
);
const hasActiveFilters =
    filters.query.trim() !== '' ||
    filters.environmentId !== 'all' ||
    filters.systemPromptId !== 'all';
const hasSelection = selectedVisibleMissions.length > 0;
const runTargetMissions = hasSelection ? selectedVisibleMissions : filteredMissions;
```

- [x] **Step 2: Add a toolbar with visible labels**

Create controls labeled `Find mission`, `Environment`, and `System prompt`. Use `Input` for text search and native `select` controls for environment and prompt to preserve accessible keyboard behavior.

- [x] **Step 3: Update batch button**

```tsx
<Button onClick={() => onRunAll(runTargetMissions)} disabled={runTargetMissions.length === 0}>
    <Play className="w-3.5 h-3.5 fill-current" />
    {hasSelection ? `Run Selected (${selectedVisibleMissions.length})` : `Run All (${filteredMissions.length})`}
</Button>
```

- [x] **Step 4: Render only `filteredMissions`**

Pass `isSelected`, `onSelectionChange`, and `selectionLabel` to each `MissionCard`.

- [x] **Step 5: Add empty filtered state**

Show `No missions match these filters.` with a `Clear filters` action when `projectMissions.length > 0` and `filteredMissions.length === 0`.

- [x] **Step 6: Verify**

Run: `npm run build`

Expected: exit `0`.

---

### Task 4: Scoped Batch Execution

**Files:**
- Modify: `src/features/ProjectEditor.tsx`
- Test: TypeScript build.

**Interfaces:**
- Consumes `onRunAll(missions: Mission[])` from Task 3.
- Produces exact execution scope.

- [x] **Step 1: Replace handler**

```tsx
const handleRunAllMissions = (missionsToRun: Mission[]) => {
    if (!geminiApiKey) {
        addToast('Configure your Gemini API Key in Settings first.', 'error');
        return;
    }
    if (missionsToRun.length === 0) {
        addToast('No missions available for this batch run.', 'error');
        return;
    }
    missionsToRun.forEach((mission) => {
        startExecution(mission, geminiApiKey);
    });
};
```

- [x] **Step 2: Verify**

Run: `npm run build`

Expected: exit `0`.

---

### Task 5: Browser Regression

**Files:**
- Create: `scratch/test-project-mission-filters.cjs`
- Test: `node scratch/test-project-mission-filters.cjs`

**Interfaces:**
- Confirms controls render, filtering updates Run All count, checking a mission switches to Run Selected.

- [x] **Step 1: Add Playwright script**

Use a Vite server on port `5177`, dismiss onboarding if visible, open `demo-shopassist-001` on its missions tab, filter by `demo-env-mock`, `sp-shop-orders`, and `Order`, assert `Run All (2)`, check a visible mission, and assert `Run Selected (1)`. Change the search to hide and then restore the selected mission, confirming that its checkbox remains selected.

- [x] **Step 2: Run focused script**

Run: `node scratch/test-project-mission-filters.cjs`

Expected: `PASS project mission filters`.

---

### Task 6: Final Review, Commit, and PR

**Files:**
- Review and commit only files listed in this plan.

**Interfaces:**
- Produces verified commit and PR branch.

- [x] **Step 1: Run verification**

Run:

```bash
npm run build
npx eslint src/features/project-editor/missionFilters.ts src/components/MissionCard.tsx src/features/project-editor/components/ProjectMissionsTab.tsx src/features/ProjectEditor.tsx
node scratch/test-project-mission-filters.cjs
```

Expected: all exit `0`.

- [x] **Step 2: Review diff**

Run: `git diff -- src/features/project-editor/missionFilters.ts src/components/MissionCard.tsx src/features/project-editor/components/ProjectMissionsTab.tsx src/features/ProjectEditor.tsx scratch/test-project-mission-filters.cjs docs/superpowers/plans/2026-07-08-project-mission-filters.md`

Expected: no unrelated file changes.

- [x] **Step 3: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-07-08-project-mission-filters.md src/features/project-editor/missionFilters.ts src/components/MissionCard.tsx src/features/project-editor/components/ProjectMissionsTab.tsx src/features/ProjectEditor.tsx scratch/test-project-mission-filters.cjs
git commit -m "feat: filter project missions before batch runs"
```

Expected: commit succeeds.

- [x] **Step 4: Push and PR**

Run: `git push -u origin codex/project-mission-filters`

Create PR title: `feat: filter project missions before batch runs`

---

## Self-Review

**Spec coverage:** The plan covers mission search, environment filtering, system prompt filtering, left-side checkboxes, filtered Run All behavior, and selected Run Selected behavior.

**Placeholder scan:** There are no undefined APIs or deferred behavior descriptions; each changed interface is named.

**Type consistency:** `onRunAll` consistently accepts `Mission[]`; selection state is `string[]`; filter IDs use existing mission/project ID fields.
