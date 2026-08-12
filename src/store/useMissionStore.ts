import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Mission } from '../types';
import { fileStorage } from '../utils/fileStorage';
import { seedMissions } from './seedData';
import { DEFAULT_GEMINI_TARGET_MODEL } from '../utils/missionTarget';

interface MissionState {
    missions: Mission[];
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
    titulo: 'Interação Básica (Mock)',
    target_system_prompt: 'Você é um assistente virtual prestativo e educado. Sua função é responder dúvidas gerais de forma clara.',
    tester_persona: 'Você é um usuário testando as capacidades de resposta do sistema. Sua meta é extrair informações sobre {{topic}}.',
    mission_goal: 'Verificar se o assistente consegue explicar o conceito de {{topic}} com clareza em menos de {{turns}} turnos.',
    variables: {
        topic: ['Inteligência Artificial', 'Automação de Testes', 'Qualidade de Software'],
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
        { id: 'crit-mock-1', name: 'Clareza', description: 'A explicação fornecida foi fácil de entender?' },
        { id: 'crit-mock-2', name: 'Alinhamento', description: 'O assistente falou corretamente sobre o tópico solicitado?' }
    ]
};

export const genericMission: Mission = {
    id: 'generic-1',
    target_provider: 'http',
    target_gemini_model: DEFAULT_GEMINI_TARGET_MODEL,
    titulo: 'Agente de Exemplo (Produção)',
    target_system_prompt: 'Você é um assistente virtual prestativo configurado para responder perguntas gerais de suporte da plataforma.',
    tester_persona: 'Você é um usuário em busca de uma informação específica. Sua meta é interagir com o assistente para extrair uma resposta sobre o funcionamento do portal. Seja direto e educado. Se precisar fornecer um código de identificação, use "ID-999-ABC".',
    mission_goal: 'Verificar se o assistente consegue responder sobre o procedimento de acesso ao portal usando o código de identificação fornecido.',
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

export const useMissionStore = create<MissionState>()(
    persist(
        (set) => ({
            missions: [defaultMockMission, genericMission, ...seedMissions],
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
        }
    )
);
