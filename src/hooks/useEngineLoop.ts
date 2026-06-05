import { useCallback } from 'react';
import { useTestExecutionStore } from '../store/useTestExecutionStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { Mission } from '../types';
import { useToastStore } from '../store/useToastStore';

export const useEngineLoop = (mission: Mission) => {
    const { geminiApiKey } = useSettingsStore();
    const addToast = useToastStore((state) => state.addToast);
    const { executions, startExecution, stopExecution, clearDebugLogs } = useTestExecutionStore();

    // Obtém o estado de execução ativa indexado pelo ID da missão, ou retorna valores default inativos
    const activeExecution = executions[mission?.id] || {
        missionId: mission?.id,
        isRunning: false,
        currentRunId: null,
        debugLogs: [],
        abortController: null,
        turnsCompleted: 0,
        maxTurns: mission?.max_turns || 5,
        error: null,
        missionTitle: mission?.titulo || '',
    };

    const startRun = useCallback(async () => {
        if (!geminiApiKey) {
            addToast("Please configure your Gemini API Key in Settings first.", "error");
            return;
        }
        if (!mission) return;
        await startExecution(mission, geminiApiKey);
    }, [mission, geminiApiKey, startExecution]);

    const stopRun = useCallback(() => {
        if (!mission) return;
        stopExecution(mission.id);
    }, [mission, stopExecution]);

    const clearLogs = useCallback(() => {
        if (!mission) return;
        clearDebugLogs(mission.id);
    }, [mission, clearDebugLogs]);

    return {
        startRun,
        stopRun,
        isRunning: activeExecution.isRunning,
        currentRunId: activeExecution.currentRunId,
        debugLogs: activeExecution.debugLogs,
        clearDebugLogs: clearLogs,
    };
};
