import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Mission } from '../types';
import { fileStorage, getLocalStorage } from '../utils/fileStorage';
import { seedMissions } from './seedData';
import { DEFAULT_GEMINI_TARGET_MODEL } from '../utils/missionTarget';

interface MissionState {
    missions: Mission[];
    isHydrated: boolean;
    setIsHydrated: (val: boolean) => void;
    addMission: (mission: Mission) => void;
    updateMission: (id: string, mission: Mission) => void;
    deleteMission: (id: string) => void;
    importMissions: (missions: Mission[]) => void;
    syncProjectSystemPrompts: (projectId: string, systemPrompts: { id: string; content: string }[]) => void;
}

export const defaultMockMission: Mission = {
    id: 'mock-1',
    target_provider: 'http',
    target_gemini_model: DEFAULT_GEMINI_TARGET_MODEL,
    titulo: 'Basic Interaction (Mock)',
    target_system_prompt: 'You are a helpful and polite virtual assistant. Your role is to answer general questions clearly.',
    tester_persona: 'You are a user testing the response capabilities of the system. Your goal is to gather information about {{topic}}.',
    mission_goal: 'Verify if the assistant can clearly explain the concept of {{topic}} in fewer than {{turns}} turns.',
    variables: {
        topic: ['Artificial Intelligence', 'Test Automation', 'Software Quality'],
        turns: [3, 5, 8],
    },
    max_turns: 8,
    api_config: {
        post_url: '/mock/api/messages',
        get_url: '/mock/api/messages',
        auth_header: 'Bearer mock-token',
        payload_template: '{\n  "message": "{{message}}"\n}',
        response_path: 'data.messages[-1].content',
        polling_interval: 2000,
        max_timeout: 30,
    },
    evaluation_criteria: [
        { id: 'crit-mock-1', name: 'Clarity', description: 'Was the explanation provided easy to understand?' },
        { id: 'crit-mock-2', name: 'Alignment', description: 'Did the assistant accurately address the requested topic?' }
    ]
};

export const genericMission: Mission = {
    id: 'generic-1',
    target_provider: 'http',
    target_gemini_model: DEFAULT_GEMINI_TARGET_MODEL,
    titulo: 'Example Agent (Production)',
    target_system_prompt: 'You are a helpful virtual assistant configured to answer general platform support questions.',
    tester_persona: 'You are a user seeking specific information. Your goal is to interact with the assistant to find out how the portal works. Be direct and polite. If asked for an identification code, use "ID-999-ABC".',
    mission_goal: 'Verify if the assistant can answer regarding portal access procedures using the provided identification code.',
    variables: {},
    max_turns: 10,
    api_config: {
        post_url: 'https://api.example.com/v1/webhook',
        get_url: 'https://api.example.com/v1/messages/{{userId}}',
        auth_header: 'Bearer YOUR_TOKEN',
        payload_template: '{\n  "userId": "user_demo",\n  "text": "{{message}}"\n}',
        response_path: 'data.text',
        polling_interval: 3000,
        max_timeout: 45,
    },
    evaluation_criteria: [
        { id: 'crit-gen-1', name: 'Resolução', description: 'O assistente forneceu a informação solicitada sobre o portal?' },
        { id: 'crit-gen-2', name: 'Tom de Voz', description: 'O assistente manteve um tom profissional e prestativo durante toda a conversa?' },
        { id: 'crit-gen-3', name: 'Eficiência', description: 'A resposta foi direta ao ponto sem repetições desnecessárias?' }
    ]
};

const getInitialMissions = (): Mission[] => {
    try {
        const storage = getLocalStorage();
        if (storage) {
            const raw = storage.getItem('agent-qa-missions');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed?.state?.missions) && parsed.state.missions.length > 0) {
                    return parsed.state.missions;
                }
            }
        }
    } catch {
        // Fallback
    }
    return [defaultMockMission, genericMission, ...seedMissions];
};

export const useMissionStore = create<MissionState>()(
    persist(
        (set) => ({
            missions: getInitialMissions(),
            isHydrated: false,
            setIsHydrated: (val) => set({ isHydrated: val }),
            addMission: (mission) => set((state) => ({ missions: [...state.missions, mission] })),
            updateMission: (id, updatedMission) =>
                set((state) => ({
                    missions: state.missions.map((m) => (m.id === id ? updatedMission : m)),
                })),
            deleteMission: (id) =>
                set((state) => ({
                    missions: state.missions.filter((m) => m.id !== id),
                })),
            importMissions: (newMissions) =>
                set((state) => {
                    const missionMap = new Map(state.missions.map(m => [m.id, m]));
                    newMissions.forEach(m => missionMap.set(m.id, m));

                    return { missions: Array.from(missionMap.values()) };
                }),
            syncProjectSystemPrompts: (projectId, systemPrompts) =>
                set((state) => {
                    const promptMap = new Map(systemPrompts.map((sp) => [sp.id, sp.content]));
                    return {
                        missions: state.missions.map((m) => {
                            if (m.project_id === projectId && m.system_prompt_id && promptMap.has(m.system_prompt_id)) {
                                return {
                                    ...m,
                                    target_system_prompt: promptMap.get(m.system_prompt_id)!,
                                };
                            }
                            return m;
                        }),
                    };
                }),
        }),
        {
            name: 'agent-qa-missions',
            storage: createJSONStorage(() => fileStorage),
            merge: (persistedState, currentState) => {
                const typedState = persistedState as Partial<MissionState> | undefined;
                if (!typedState?.missions?.length) return { ...currentState };

                // Merge by ID: persisted missions win, new seeds are appended
                const mergedMap = new Map<string, Mission>();
                // Start with seed/default missions
                currentState.missions.forEach((m) => mergedMap.set(m.id, m));
                // Overwrite with persisted missions (user data has priority)
                typedState.missions.forEach((m) => mergedMap.set(m.id, m));

                return {
                    ...currentState,
                    ...typedState,
                    missions: Array.from(mergedMap.values()),
                };
            },
            onRehydrateStorage: () => (state) => {
                state?.setIsHydrated(true);
            },
        }
    )
);
