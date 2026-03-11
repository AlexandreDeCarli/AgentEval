import React, { useState } from 'react';
import { useTestRunStore } from '../store/useTestRunStore';
import { useMissionStore } from '../store/useMissionStore';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EvaluationReport } from './EvaluationReport';
import { ChatBubble } from '../components/ChatBubble';
import { TestRun } from '../types';
import { Trash2, ExternalLink } from 'lucide-react';

export const TestHistory: React.FC = () => {
    const { runs, deleteRun } = useTestRunStore();
    const { missions } = useMissionStore();

    const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);

    const getMissionTitle = (id: string) => missions.find(m => m.id === id)?.titulo || 'Unknown Mission';

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Test History</h1>
                <p className="text-muted-foreground mt-1">Review past execution logs and evaluations.</p>
            </div>

            <div className="border border-border bg-card rounded-xl shadow-sm overflow-hidden">
                {runs.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                        No tests have been run yet.
                    </div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Mission</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Turns</th>
                                <th className="px-6 py-4">Score</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {runs.map((run) => (
                                <tr key={run.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {new Date(run.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 font-medium">
                                        {getMissionTitle(run.mission_id)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={run.status === 'success' ? 'success' : run.status === 'failed' ? 'destructive' : 'secondary'}>
                                            {run.status.toUpperCase()}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        {Math.floor(run.chat_history.length / 2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {run.evaluation ? (
                                            <span className="font-bold">{run.evaluation.overall_score}/100</span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedRun(run)}>
                                            <ExternalLink className="w-4 h-4 mr-2" /> View Details
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => deleteRun(run.id)} className="text-destructive hover:bg-destructive/10">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Details Modal */}
            <Modal isOpen={!!selectedRun} onClose={() => setSelectedRun(null)} title="Test Run Details" size="full">
                {selectedRun && (
                    <div className="space-y-8 pb-4">
                        <div>
                            <h3 className="font-semibold text-sm mb-2 uppercase text-muted-foreground tracking-wider">Variables Used</h3>
                            <div className="bg-muted p-3 rounded-md font-mono text-xs break-all">
                                {JSON.stringify(selectedRun.resolved_variables)}
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-sm mb-4 uppercase text-muted-foreground tracking-wider">Chat Log</h3>
                            <div className="space-y-2 border border-border p-4 rounded-xl bg-background/50">
                                {selectedRun.chat_history.map(msg => (
                                    <ChatBubble key={msg.id} message={msg} />
                                ))}
                            </div>
                        </div>

                        {selectedRun.evaluation && (
                            <div>
                                <h3 className="font-semibold text-sm mb-4 uppercase text-muted-foreground tracking-wider">Evaluation</h3>
                                <div className="border border-border p-4 rounded-xl bg-background/50">
                                    <EvaluationReport
                                        evaluation={selectedRun.evaluation}
                                        mission={missions.find(m => m.id === selectedRun.mission_id)}
                                    />
                                </div>
                            </div>
                        )}

                        {selectedRun.error && (
                            <div>
                                <h3 className="font-semibold text-sm mb-2 uppercase text-destructive tracking-wider">Error</h3>
                                <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-md text-sm">
                                    {selectedRun.error}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};
