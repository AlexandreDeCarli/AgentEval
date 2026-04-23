import { useState, useRef, useCallback } from 'react';
import { useTestRunStore } from '../store/useTestRunStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useProjectStore } from '../store/useProjectStore';
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

export const useEngineLoop = (mission: Mission) => {
    const [isRunning, setIsRunning] = useState(false);
    const [currentRunId, setCurrentRunId] = useState<string | null>(null);
    const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);

    const { geminiApiKey } = useSettingsStore();
    const { addRun, updateRunStatus, addMessage, updateMessage, addDebugLog, setEvaluation } = useTestRunStore();
    const { projects } = useProjectStore();

    const currentRunIdRef = useRef<string | null>(null);

    const appendDebugLog = useCallback((entry: DebugLogEntry) => {
        setDebugLogs((prev) => [...prev.slice(-99), entry]); // keep last 100 in UI
        if (currentRunIdRef.current) {
            addDebugLog(currentRunIdRef.current, entry); // persist to store
        }
    }, [addDebugLog]);

    const abortControllerRef = useRef<AbortController | null>(null);

    const stopRun = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsRunning(false);
    }, []);

    const startRun = useCallback(async () => {
        if (!geminiApiKey) {
            alert("Please configure your Gemini API Key in Settings first.");
            return;
        }

        setIsRunning(true);
        const runId = crypto.randomUUID();
        setCurrentRunId(runId);
        currentRunIdRef.current = runId;
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        // 0. Resolve api_config from project environment (runtime, not stale copy)
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

        // 1. Setup variables
        const resolvedVars = resolveVariables(mission.variables || {});
        
        console.log('--- STARTING MISSION RUN ---');
        console.log('Mission ID:', mission.id);
        console.log('Mission Title:', mission.titulo);
        console.log('Resolved Variables:', resolvedVars);

        // Add mission info to variables for replacement (e.g. {{target_system_prompt}})
        const contextVars = {
            ...resolvedVars,
            target_system_prompt: mission.target_system_prompt,
            mission_goal: mission.mission_goal,
            tester_persona: mission.tester_persona,
            titulo: mission.titulo
        };

        const testerPersona = applyVariables(mission.tester_persona, contextVars);
        const missionGoal = applyVariables(mission.mission_goal, contextVars);
        
        console.log('Tester Persona (Resolved):', testerPersona);
        console.log('Mission Goal (Resolved):', missionGoal);

        // Pre-process API config with variables (uses runtime config from environment)
        const processedApiConfig = targetProvider === 'http'
            ? {
                ...runtimeApiConfig,
                post_url: applyVariables(runtimeApiConfig.post_url, contextVars),
                get_url: applyVariables(runtimeApiConfig.get_url, contextVars),
                payload_template: applyVariables(runtimeApiConfig.payload_template, contextVars),
                auth_header: applyVariables(runtimeApiConfig.auth_header, contextVars),
            }
            : null;

        console.log('Target Provider:', targetProvider);
        if (processedApiConfig) {
            console.log('Processed API Config:', processedApiConfig);
        } else {
            console.log('Target Gemini Model:', targetGeminiModel);
        }

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

        addRun(newRun);

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
                addMessage(runId, testerMsg);

                if (testerResult.missionCompleted) {
                    missionCompleted = true;
                    break;
                }

                // ==== DELAY: Simulate typing time before sending ====
                // 40ms per character to match the ChatBubble typing animation
                const typingDelay = testerResult.message.length * 40;
                await new Promise((resolve) => setTimeout(resolve, typingDelay));

                if (signal.aborted) throw new Error('Test aborted by user');

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
                    addMessage(runId, targetMsg);
                } else if (processedApiConfig) {
                    // Poll for target response. Pass the pre-POST state so it knows which messages are actually new.
                    const preStateIds = await fetchPreStateIds(processedApiConfig, signal);

                    await sendTargetMessage(processedApiConfig, testerResult.message, signal, appendDebugLog);

                    await pollTargetResponse(processedApiConfig, preStateIds, (msgId, content, status) => {
                        const isProcessing = status === 'processing';

                        const existingMsg = chatHistory.find((m) => m.id === msgId);
                        if (existingMsg) {
                            existingMsg.content = content;
                            existingMsg.isProcessing = isProcessing;
                            updateMessage(runId, msgId, existingMsg);
                        } else {
                            const newMsg: ChatMessage = {
                                id: msgId,
                                role: 'target',
                                content,
                                timestamp: Date.now(),
                                isProcessing
                            };
                            chatHistory.push(newMsg);
                            addMessage(runId, newMsg);
                        }
                    }, signal, appendDebugLog);
                }

                currentTurn++;
            }

            // ==== EVALUATION ====
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
                avg_time_to_complete_response_ms: Math.round(avgComplete)
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

            setEvaluation(runId, evalResult);
            updateRunStatus(runId, missionCompleted ? 'success' : 'failed');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (errorMessage !== 'Test aborted by user') {
                updateRunStatus(runId, 'failed', errorMessage);
            }
        } finally {
            setIsRunning(false);
        }
    }, [
        mission,
        geminiApiKey,
        projects,
        addRun,
        updateRunStatus,
        addMessage,
        updateMessage,
        setEvaluation,
        appendDebugLog,
    ]);

    return {
        startRun,
        stopRun,
        isRunning,
        currentRunId,
        debugLogs,
        clearDebugLogs: useCallback(() => setDebugLogs([]), []),
    };
};
