import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Project, SystemPrompt, Environment } from '../types';
import { fileStorage } from '../utils/fileStorage';
import { seedProject } from './seedData';
import { DEFAULT_GEMINI_TARGET_MODEL } from '../utils/missionTarget';

interface ProjectState {
    projects: Project[];
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

export const useProjectStore = create<ProjectState>()(
    persist(
        (set) => ({
            projects: [seedProject],
            addProject: (project) =>
                set((state) => ({ projects: [...state.projects, project] })),
            updateProject: (id, project) =>
                set((state) => ({
                    projects: state.projects.map((p) => (p.id === id ? project : p)),
                })),
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
                const rawProjects = typedState?.projects ?? currentState.projects;

                return {
                    ...currentState,
                    ...typedState,
                    projects: rawProjects.map((project) => ({
                        ...project,
                        target_gemini_model:
                            project.target_gemini_model?.trim() ||
                            DEFAULT_GEMINI_TARGET_MODEL,
                    })),
                };
            },
        }
    )
);
