import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMissionStore } from '../store/useMissionStore';
import { useEngineLoop } from '../hooks/useEngineLoop';
import { useTestRunStore } from '../store/useTestRunStore';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { ChatBubble } from '../components/ChatBubble';
import { ArrowLeft, PlaySquare, Square, Terminal, X, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { EvaluationReport } from './EvaluationReport';
import { enableMockService, resetMockService } from '../services/mockService';
import { DebugLogEntry } from '../services/targetApi';

export const TestRunner: React.FC = () => {
    const { missionId } = useParams();
    const navigate = useNavigate();
    const { missions } = useMissionStore();
    const mission = missions.find(m => m.id === missionId);

    const { runs } = useTestRunStore();

    const { startRun, stopRun, isRunning, currentRunId, debugLogs, clearDebugLogs } = useEngineLoop(mission!);
    const currentRun = runs.find(r => r.id === currentRunId);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const [showDebug, setShowDebug] = useState(false);
    const debugEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentRun?.chat_history]);

    useEffect(() => {
        if (showDebug) {
            debugEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [debugLogs, showDebug]);

    useEffect(() => {
        if (mission?.api_config.post_url.includes('/mock/api')) {
            enableMockService();
        }
        return () => resetMockService();
    }, [mission]);

    if (!mission) {
        return <div className="p-8">Mission not found. <Button onClick={() => navigate('/')}>Go back</Button></div>;
    }

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="flex-none p-4 border-b border-border bg-card flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => { stopRun(); navigate(-1); }}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">{mission.titulo}</h1>
                        <span className="text-xs text-muted-foreground">Test Runner</span>
                    </div>
                </div>
                <div>
                    {!isRunning ? (
                        <Button onClick={startRun} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                            <PlaySquare className="w-4 h-4" /> Start New Test
                        </Button>
                    ) : (
                        <Button onClick={stopRun} variant="destructive" className="gap-2">
                            <Square className="w-4 h-4 fill-current" /> Stop Test
                        </Button>
                    )}
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar / Variables info */}
                <aside className="w-80 border-r border-border bg-muted/30 p-4 overflow-y-auto hidden lg:block">
                    <h3 className="font-semibold text-sm mb-4 uppercase tracking-wider text-muted-foreground">Mission Context</h3>
                    {currentRun ? (
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Status</span>
                                <div>
                                    <Badge variant={currentRun.status === 'success' ? 'success' : currentRun.status === 'failed' ? 'destructive' : 'default'}>
                                        {currentRun.status.toUpperCase()}
                                    </Badge>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Resolved Variables</span>
                                <div className="bg-card border border-border rounded-md p-3 text-xs font-mono break-all space-y-1">
                                    {Object.entries(currentRun.resolved_variables || {}).map(([k, v]) => (
                                        <div key={k}><span className="text-primary">{k}:</span> {JSON.stringify(v)}</div>
                                    ))}
                                    {Object.keys(currentRun.resolved_variables || {}).length === 0 && <span className="text-muted-foreground">No variables used.</span>}
                                </div>
                            </div>
                            {currentRun.error && (
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Error Details</span>
                                    <div className="bg-destructive/20 border border-destructive/50 text-destructive-foreground rounded-md p-3 text-xs">
                                        {currentRun.error}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground text-center mt-10">
                            Click 'Start New Test' to resolve variables and begin.
                        </div>
                    )}
                </aside>

                {/* Chat Area */}
                <main className="flex-1 flex flex-col relative overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2">
                        {!currentRun && (
                            <div className="h-full flex items-center justify-center text-muted-foreground flex-col">
                                <BotIcon className="w-16 h-16 mb-4 opacity-20" />
                                <p>Waiting to start...</p>
                            </div>
                        )}

                        {currentRun?.chat_history.map((msg, index) => {
                            const isLastTester = msg.role === 'tester' && index === currentRun.chat_history.length - 1;
                            return (
                                <ChatBubble
                                    key={msg.id}
                                    message={msg}
                                    animateTyping={isRunning && isLastTester}
                                />
                            );
                        })}

                        {isRunning && currentRun?.chat_history.length! % 2 !== 0 && (
                            <div className="flex justify-end mb-4">
                                <div className="bg-muted text-muted-foreground text-sm rounded-lg p-3 flex items-center gap-3">
                                    <Spinner className="w-4 h-4" /> Target is typing (Polling...)
                                </div>
                            </div>
                        )}

                        {isRunning && currentRun?.chat_history.length! % 2 === 0 && currentRun?.chat_history.length! > 0 && (
                            <div className="flex justify-start mb-4">
                                <div className="bg-muted text-muted-foreground text-sm rounded-lg p-3 flex items-center gap-3">
                                    <Spinner className="w-4 h-4" /> Tester is thinking...
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Debug Panel */}
                    {showDebug && (
                        <div className="flex-none h-72 border-t border-border bg-zinc-950 text-zinc-200 flex flex-col text-xs font-mono">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900">
                                <div className="flex items-center gap-2">
                                    <Terminal className="w-3.5 h-3.5 text-green-400" />
                                    <span className="text-zinc-400 font-sans">API Inspector</span>
                                    <span className="text-zinc-600">({debugLogs.length} requests)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => clearDebugLogs()}
                                        className="p-1 hover:text-zinc-100 text-zinc-500 transition-colors"
                                        title="Limpar logs"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setShowDebug(false)}
                                        className="p-1 hover:text-zinc-100 text-zinc-500 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {debugLogs.length === 0 && (
                                    <div className="text-zinc-600 p-2 font-sans">Nenhuma requisição ainda. Inicie um teste.</div>
                                )}
                                {debugLogs.map((entry) => (
                                    <DebugEntry key={entry.id} entry={entry} />
                                ))}
                                <div ref={debugEndRef} />
                            </div>
                        </div>
                    )}

                    {/* Debug toggle button */}
                    <button
                        onClick={() => setShowDebug(v => !v)}
                        className={`absolute bottom-3 right-3 p-1.5 rounded-md transition-colors z-10 ${
                            showDebug
                                ? 'bg-zinc-800 text-green-400'
                                : 'bg-muted/80 text-muted-foreground hover:text-foreground hover:bg-muted'
                        } ${debugLogs.length > 0 ? 'ring-1 ring-green-500/40' : ''}`}
                        title="API Inspector"
                    >
                        <Terminal className="w-3.5 h-3.5" />
                    </button>

                    {/* Evaluation Overlay if done */}
                    {currentRun?.evaluation && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center p-4">
                            <div className="bg-card w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border shadow-2xl rounded-xl">
                                <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-card z-20">
                                    <h2 className="font-bold text-lg">Evaluation Report</h2>
                                    <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>View in History</Button>
                                </div>
                                <div className="p-6">
                                    <EvaluationReport evaluation={currentRun.evaluation} mission={mission} />
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

// Debug log entry row with expandable response
const DebugEntry: React.FC<{ entry: DebugLogEntry }> = ({ entry }) => {
    const [expanded, setExpanded] = useState(false);
    const time = new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isOk = entry.status >= 200 && entry.status < 300;
    const methodColor = entry.type === 'POST' ? 'text-blue-400' : 'text-yellow-400';
    const statusColor = isOk ? 'text-green-400' : 'text-red-400';

    return (
        <div className="rounded border border-zinc-800 bg-zinc-900/50">
            <button
                className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800/50 transition-colors text-left"
                onClick={() => setExpanded(v => !v)}
            >
                {expanded ? <ChevronDown className="w-3 h-3 text-zinc-500 flex-none" /> : <ChevronRight className="w-3 h-3 text-zinc-500 flex-none" />}
                <span className="text-zinc-600">{time}</span>
                <span className={`font-bold ${methodColor}`}>{entry.type}</span>
                <span className={`font-bold ${statusColor}`}>{entry.status}</span>
                <span className="text-zinc-400 truncate flex-1">{entry.url}</span>
                <span className="text-zinc-600 flex-none">{entry.duration}ms</span>
            </button>
            {expanded && (
                <div className="border-t border-zinc-800 p-2 space-y-2">
                    {entry.requestBody && (
                        <div>
                            <div className="text-zinc-500 mb-1">Request Body:</div>
                            <pre className="text-zinc-300 whitespace-pre-wrap break-all leading-relaxed">
                                {JSON.stringify(entry.requestBody, null, 2)}
                            </pre>
                        </div>
                    )}
                    <div>
                        <div className="text-zinc-500 mb-1">Response:</div>
                        <pre className="text-zinc-300 whitespace-pre-wrap break-all leading-relaxed">
                            {JSON.stringify(entry.response, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

// Simple bot icon placeholder
const BotIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
);
