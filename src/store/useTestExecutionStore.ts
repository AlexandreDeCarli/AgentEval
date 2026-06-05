import { create } from 'zustand';
import { Mission, TestRun, ChatMessage } from '../types';
import { resolveVariables, applyVariables } from '../utils/templateEngine';
import {
    generateTesterMessage,
    generateEvaluation,
    generateGeminiTargetResponse,
} from '../services/llm';
import { sendTargetMessage, pollTargetResponse, fetchPreStateIds, DebugLogEntry } from '../services/targetApi';
import {
    getMissionGeminiModel,
    getMissionTargetProvider,
    getProjectGeminiModel,
    getProjectTargetProvider,
} from '../utils/missionTarget';
import { useTestRunStore } from './useTestRunStore';
import { useProjectStore } from './useProjectStore';
import { useToastStore } from './useToastStore';

export interface ExecutionState {
    missionId: string;
    isRunning: boolean;
    currentRunId: string | null;
    debugLogs: DebugLogEntry[];
    abortController: AbortController | null;
    turnsCompleted: number;
    maxTurns: number;
    error: string | null;
    missionTitle: string;
}

interface TestExecutionStore {
    executions: { [missionId: string]: ExecutionState };
    startExecution: (mission: Mission, geminiApiKey: string) => Promise<void>;
    stopExecution: (missionId: string) => void;
    clearDebugLogs: (missionId: string) => void;
}

export const useTestExecutionStore = create<TestExecutionStore>()((set, get) => ({
    executions: {},

    stopExecution: (missionId) => {
        const exec = get().executions[missionId];
        if (exec && exec.abortController) {
            exec.abortController.abort();
        }
        set((state) => {
            const current = state.executions[missionId];
            if (!current) return state;
            return {
                executions: {
                    ...state.executions,
                    [missionId]: {
                        ...current,
                        isRunning: false,
                    },
                },
            };
        });
    },

    clearDebugLogs: (missionId) => {
        set((state) => {
            const current = state.executions[missionId];
            if (!current) return state;
            return {
                executions: {
                    ...state.executions,
                    [missionId]: {
                        ...current,
                        debugLogs: [],
                    },
                },
            };
        });
    },

    startExecution: async (mission, geminiApiKey) => {
        // Se já estiver rodando, ignora para evitar duplicidade
        const existing = get().executions[mission.id];
        if (existing && existing.isRunning) {
            return;
        }

        const runId = crypto.randomUUID();
        const abortController = new AbortController();
        const signal = abortController.signal;

        // Registrar o estado inicial de execução
        set((state) => ({
            executions: {
                ...state.executions,
                [mission.id]: {
                    missionId: mission.id,
                    isRunning: true,
                    currentRunId: runId,
                    debugLogs: [],
                    abortController,
                    turnsCompleted: 0,
                    maxTurns: mission.max_turns,
                    error: null,
                    missionTitle: mission.titulo,
                },
            },
        }));

        const appendDebugLog = (entry: DebugLogEntry) => {
            set((state) => {
                const exec = state.executions[mission.id];
                if (!exec) return state;
                return {
                    executions: {
                        ...state.executions,
                        [mission.id]: {
                            ...exec,
                            debugLogs: [...exec.debugLogs.slice(-99), entry],
                        },
                    },
                };
            });
            useTestRunStore.getState().addDebugLog(runId, entry); // Persiste na store de logs gerais
        };

        // 0. Resolver api_config do ambiente do projeto
        const projects = useProjectStore.getState().projects;
        const project = mission.project_id
            ? projects.find((candidate) => candidate.id === mission.project_id)
            : undefined;
        const targetProvider = project
            ? getProjectTargetProvider(project, mission)
            : getMissionTargetProvider(mission);
        const targetGeminiModel = project
            ? getProjectGeminiModel(project, mission)
            : getMissionGeminiModel(mission);
        let runtimeApiConfig = mission.api_config;
        if (targetProvider === 'http' && project && mission.environment_id) {
            const env = project?.environments.find((e) => e.id === mission.environment_id);
            if (env) {
                runtimeApiConfig = env.api_config;
            }
        }

        // 1. Resolver variáveis
        const resolvedVars = resolveVariables(mission.variables || {});
        const contextVars = {
            ...resolvedVars,
            target_system_prompt: mission.target_system_prompt,
            mission_goal: mission.mission_goal,
            tester_persona: mission.tester_persona,
            titulo: mission.titulo,
        };

        const testerPersona = applyVariables(mission.tester_persona, contextVars);
        const missionGoal = applyVariables(mission.mission_goal, contextVars);

        // Preprocessar configuração da API
        const processedApiConfig = targetProvider === 'http'
            ? {
                ...runtimeApiConfig,
                post_url: applyVariables(runtimeApiConfig.post_url, contextVars),
                get_url: applyVariables(runtimeApiConfig.get_url, contextVars),
                payload_template: applyVariables(runtimeApiConfig.payload_template, contextVars),
                auth_header: applyVariables(runtimeApiConfig.auth_header, contextVars),
            }
            : null;

        const newRun: TestRun = {
            id: runId,
            mission_id: mission.id,
            status: 'running',
            chat_history: [],
            debug_logs: [],
            evaluation: null,
            resolved_variables: resolvedVars,
            created_at: Date.now(),
            updated_at: Date.now(),
        };

        useTestRunStore.getState().addRun(newRun);

        let currentTurn = 0;
        let missionCompleted = false;
        const chatHistory: ChatMessage[] = [];

        try {
            while (currentTurn < mission.max_turns && !missionCompleted) {
                if (signal.aborted) throw new Error('Test aborted by user');

                // ==== TURN: TESTER ====
                const testerResult = await generateTesterMessage(
                    geminiApiKey,
                    testerPersona,
                    missionGoal,
                    chatHistory
                );

                const testerMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    role: 'tester',
                    content: testerResult.message,
                    timestamp: Date.now(),
                    isCompletedFlag: testerResult.missionCompleted,
                };

                chatHistory.push(testerMsg);
                useTestRunStore.getState().addMessage(runId, testerMsg);

                if (testerResult.missionCompleted) {
                    missionCompleted = true;
                    break;
                }

                // ==== DELAY: Simular tempo de digitação (40ms por caracter) ====
                const typingDelay = Math.min(testerResult.message.length * 40, 4000); // Teto de 4s para evitar loops travados
                await new Promise((resolve, reject) => {
                    const onAbort = () => {
                        clearTimeout(timer);
                        reject(new Error('Test aborted by user'));
                    };
                    const timer = setTimeout(() => {
                        signal.removeEventListener('abort', onAbort);
                        resolve(null);
                    }, typingDelay);
                    
                    if (signal.aborted) {
                        clearTimeout(timer);
                        reject(new Error('Test aborted by user'));
                        return;
                    }
                    signal.addEventListener('abort', onAbort);
                });

                if (signal.aborted) throw new Error('Test aborted by user');

                // Update turn completed progress
                set((state) => {
                    const exec = state.executions[mission.id];
                    if (!exec) return state;
                    return {
                        executions: {
                            ...state.executions,
                            [mission.id]: {
                                ...exec,
                                turnsCompleted: currentTurn + 1,
                            },
                        },
                    };
                });

                if (targetProvider === 'gemini') {
                    const targetResponse = await generateGeminiTargetResponse(
                        geminiApiKey,
                        targetGeminiModel,
                        mission.target_system_prompt,
                        chatHistory,
                        signal,
                        appendDebugLog
                    );

                    const targetMsg: ChatMessage = {
                        id: crypto.randomUUID(),
                        role: 'target',
                        content: targetResponse,
                        timestamp: Date.now(),
                        isProcessing: false,
                    };

                    chatHistory.push(targetMsg);
                    useTestRunStore.getState().addMessage(runId, targetMsg);
                } else if (processedApiConfig) {
                    // Gemini provider ou HTTP
                    const preStateIds = await fetchPreStateIds(processedApiConfig, signal);
                    await sendTargetMessage(processedApiConfig, testerResult.message, signal, appendDebugLog);

                    await pollTargetResponse(processedApiConfig, preStateIds, (msgId, content, status) => {
                        const isProcessing = status === 'processing';
                        const existingMsg = chatHistory.find((m) => m.id === msgId);
                        if (existingMsg) {
                            existingMsg.content = content;
                            existingMsg.isProcessing = isProcessing;
                            useTestRunStore.getState().updateMessage(runId, msgId, existingMsg);
                        } else {
                            const newMsg: ChatMessage = {
                                id: msgId,
                                role: 'target',
                                content,
                                timestamp: Date.now(),
                                isProcessing,
                            };
                            chatHistory.push(newMsg);
                            useTestRunStore.getState().addMessage(runId, newMsg);
                        }
                    }, signal, appendDebugLog);
                }

                currentTurn++;
            }

            // ==== AVALIAÇÃO DE RESULTADOS ====
            if (signal.aborted) throw new Error('Test aborted before evaluation');

            const firstResponses: number[] = [];
            const completeResponses: number[] = [];

            for (let i = 0; i < chatHistory.length; i++) {
                if (chatHistory[i].role === 'tester') {
                    const testerTime = chatHistory[i].timestamp;
                    let firstTargetTime: number | null = null;
                    let lastTargetTime: number | null = null;

                    let j = i + 1;
                    while (j < chatHistory.length && chatHistory[j].role === 'target') {
                        if (firstTargetTime === null) firstTargetTime = chatHistory[j].timestamp;
                        lastTargetTime = chatHistory[j].timestamp;
                        j++;
                    }

                    if (firstTargetTime !== null) firstResponses.push(firstTargetTime - testerTime);
                    if (lastTargetTime !== null) completeResponses.push(lastTargetTime - testerTime);
                }
            }

            const avgFirst = firstResponses.length ? firstResponses.reduce((a, b) => a + b, 0) / firstResponses.length : 0;
            const avgComplete = completeResponses.length ? completeResponses.reduce((a, b) => a + b, 0) / completeResponses.length : 0;

            const metrics = {
                avg_time_to_first_response_ms: Math.round(avgFirst),
                avg_time_to_complete_response_ms: Math.round(avgComplete),
            };

            const evalResult = await generateEvaluation(
                geminiApiKey,
                chatHistory,
                mission.target_system_prompt,
                missionGoal,
                mission.max_turns,
                mission.evaluation_criteria || [],
                metrics
            );

            useTestRunStore.getState().setEvaluation(runId, evalResult);
            useTestRunStore.getState().updateRunStatus(runId, missionCompleted ? 'success' : 'failed');
            useToastStore.getState().addToast(
                `Test Run for "${mission.titulo}" completed with score: ${evalResult.overall_score}/100`,
                'success'
            );

            set((state) => {
                const exec = state.executions[mission.id];
                if (!exec) return state;
                return {
                    executions: {
                        ...state.executions,
                        [mission.id]: {
                            ...exec,
                            isRunning: false,
                        },
                    },
                };
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set((state) => {
                const exec = state.executions[mission.id];
                if (!exec) return state;
                return {
                    executions: {
                        ...state.executions,
                        [mission.id]: {
                            ...exec,
                            isRunning: false,
                            error: errorMessage === 'Test aborted by user' ? null : errorMessage,
                        },
                    },
                };
            });
            if (errorMessage !== 'Test aborted by user') {
                useTestRunStore.getState().updateRunStatus(runId, 'failed', errorMessage);
                useToastStore.getState().addToast(
                    `Test Run for "${mission.titulo}" failed: ${errorMessage}`,
                    'error'
                );
            }
        }
    },
}));
