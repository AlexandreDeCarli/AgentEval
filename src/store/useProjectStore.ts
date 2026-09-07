import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Project, SystemPrompt, Environment } from '../types';
import { fileStorage, getLocalStorage } from '../utils/fileStorage';
import { seedProject } from './seedData';
import { DEFAULT_GEMINI_TARGET_MODEL } from '../utils/missionTarget';

interface ProjectState {
    projects: Project[];
    isHydrated: boolean;
    setIsHydrated: (val: boolean) => void;
    addProject: (project: Project) => void;
    updateProject: (id: string, project: Project) => void;
    deleteProject: (id: string) => void;
    addSystemPrompt: (projectId: string, prompt: SystemPrompt) => void;
    updateSystemPrompt: (projectId: string, promptId: string, prompt: SystemPrompt) => void;
    deleteSystemPrompt: (projectId: string, promptId: string) => void;
    addEnvironment: (projectId: string, env: Environment) => void;
    updateEnvironment: (projectId: string, envId: string, env: Environment) => void;
    deleteEnvironment: (projectId: string, envId: string) => void;
}

const getInitialProjects = (): Project[] => {
    try {
        const storage = getLocalStorage();
        if (storage) {
            const raw = storage.getItem('agent-qa-projects');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed?.state?.projects) && parsed.state.projects.length > 0) {
                    return parsed.state.projects;
                }
            }
        }
    } catch {
        // Fallback to seed
    }
    return [seedProject];
};

export const useProjectStore = create<ProjectState>()(
    persist(
        (set) => ({
            projects: getInitialProjects(),
            isHydrated: false,
            setIsHydrated: (val) => set({ isHydrated: val }),
            addProject: (project) =>
                set((state) => {
                    const exists = state.projects.some((p) => p.id === project.id);
                    return {
                        projects: exists
                            ? state.projects.map((p) => (p.id === project.id ? project : p))
                            : [...state.projects, project],
                    };
                }),
            updateProject: (id, project) =>
                set((state) => {
                    const exists = state.projects.some((p) => p.id === id);
                    return {
                        projects: exists
                            ? state.projects.map((p) => (p.id === id ? project : p))
                            : [...state.projects, project],
                    };
                }),
            deleteProject: (id) =>
                set((state) => ({
                    projects: state.projects.filter((p) => p.id !== id),
                })),
            addSystemPrompt: (projectId, prompt) =>
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === projectId
                            ? { ...p, system_prompts: [...p.system_prompts, prompt] }
                            : p
                    ),
                })),
            updateSystemPrompt: (projectId, promptId, prompt) =>
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === projectId
                            ? {
                                  ...p,
                                  system_prompts: p.system_prompts.map((sp) =>
                                      sp.id === promptId ? prompt : sp
                                  ),
                              }
                            : p
                    ),
                })),
            deleteSystemPrompt: (projectId, promptId) =>
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === projectId
                            ? {
                                  ...p,
                                  system_prompts: p.system_prompts.filter(
                                      (sp) => sp.id !== promptId
                                  ),
                              }
                            : p
                    ),
                })),
            addEnvironment: (projectId, env) =>
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === projectId
                            ? { ...p, environments: [...p.environments, env] }
                            : p
                    ),
                })),
            updateEnvironment: (projectId, envId, env) =>
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === projectId
                            ? {
                                  ...p,
                                  environments: p.environments.map((e) =>
                                      e.id === envId ? env : e
                                  ),
                              }
                            : p
                    ),
                })),
            deleteEnvironment: (projectId, envId) =>
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === projectId
                            ? {
                                  ...p,
                                  environments: p.environments.filter(
                                      (e) => e.id !== envId
                                  ),
                              }
                            : p
                    ),
                })),
        }),
        {
            name: 'agent-qa-projects',
            storage: createJSONStorage(() => fileStorage),
            merge: (persistedState, currentState) => {
                const typedState = persistedState as Partial<ProjectState> | undefined;
                const persistedProjects = typedState?.projects;

                if (!Array.isArray(persistedProjects) || persistedProjects.length === 0) {
                    return {
                        ...currentState,
                        ...typedState,
                        projects: currentState.projects,
                    };
                }

                // Merge by ID: persisted projects take full precedence
                const mergedMap = new Map<string, Project>();
                currentState.projects.forEach((p) => mergedMap.set(p.id, p));
                persistedProjects.forEach((p) => mergedMap.set(p.id, p));

                const mergedProjects = Array.from(mergedMap.values()).map((project) => ({
                    ...project,
                    target_gemini_model:
                        project.target_gemini_model?.trim() ||
                        DEFAULT_GEMINI_TARGET_MODEL,
                }));

                return {
                    ...currentState,
                    ...typedState,
                    projects: mergedProjects,
                };
            },
            onRehydrateStorage: () => (state) => {
                state?.setIsHydrated(true);
            },
        }
    )
);
