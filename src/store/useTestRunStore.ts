import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TestRun, ChatMessage, Evaluation, DebugLogEntry } from '../types';
import { fileStorage } from '../utils/fileStorage';

interface TestRunState {
    runs: TestRun[];
    addRun: (run: TestRun) => void;
    updateRunStatus: (id: string, status: TestRun['status'], error?: string) => void;
    addMessage: (id: string, message: ChatMessage) => void;
    updateMessage: (runId: string, msgId: string, message: ChatMessage) => void;
    addDebugLog: (id: string, entry: DebugLogEntry) => void;
    setEvaluation: (id: string, evalResult: Evaluation) => void;
    deleteRun: (id: string) => void;
}

export const useTestRunStore = create<TestRunState>()(
    persist(
        (set) => ({
            runs: [],
            addRun: (run) => set((state) => ({ runs: [run, ...state.runs] })),
            updateRunStatus: (id, status, error) =>
                set((state) => ({
                    runs: state.runs.map((r) => (r.id === id ? { ...r, status, error, updated_at: Date.now() } : r)),
                })),
            addMessage: (id, message) =>
                set((state) => ({
                    runs: state.runs.map((r) =>
                        r.id === id
                            ? { ...r, chat_history: [...r.chat_history, message], updated_at: Date.now() }
                            : r
                    ),
                })),
            updateMessage: (runId, msgId, message) =>
                set((state) => ({
                    runs: state.runs.map((r) =>
                        r.id === runId
                            ? {
                                ...r,
                                chat_history: r.chat_history.map((m) => (m.id === msgId ? message : m)),
                                updated_at: Date.now(),
                            }
                            : r
                    ),
                })),
            addDebugLog: (id, entry) =>
                set((state) => ({
                    runs: state.runs.map((r) =>
                        r.id === id
                            ? { ...r, debug_logs: [...(r.debug_logs || []), entry] }
                            : r
                    ),
                })),
            setEvaluation: (id, evalResult) =>
                set((state) => ({
                    runs: state.runs.map((r) =>
                        r.id === id ? { ...r, evaluation: evalResult, updated_at: Date.now() } : r
                    ),
                })),
            deleteRun: (id) =>
                set((state) => ({
                    runs: state.runs.filter((r) => r.id !== id),
                })),
        }),
        {
            name: 'agent-qa-test-runs',
            storage: createJSONStorage(() => fileStorage),
        }
    )
);
