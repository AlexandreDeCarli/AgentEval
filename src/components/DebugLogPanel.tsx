import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { DebugLogEntry } from '../types';

export const DebugLogEntry_: React.FC<{ entry: DebugLogEntry }> = ({ entry }) => {
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
                    {entry.requestBody !== undefined && (
                        <div>
                            <div className="text-zinc-500 mb-1">Request Body:</div>
                            <pre className="text-zinc-300 whitespace-pre-wrap break-all leading-relaxed text-xs">
                                {JSON.stringify(entry.requestBody, null, 2)}
                            </pre>
                        </div>
                    )}
                    <div>
                        <div className="text-zinc-500 mb-1">Response:</div>
                        <pre className="text-zinc-300 whitespace-pre-wrap break-all leading-relaxed text-xs">
                            {JSON.stringify(entry.response, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export const DebugLogPanel: React.FC<{ logs: DebugLogEntry[] }> = ({ logs }) => {
    const [expanded, setExpanded] = useState(false);

    if (!logs || logs.length === 0) return null;

    const getCount = logs.filter(l => l.type === 'GET').length;
    const postCount = logs.filter(l => l.type === 'POST').length;

    return (
        <div>
            <button
                className="flex items-center gap-2 font-semibold text-sm uppercase text-muted-foreground tracking-wider hover:text-foreground transition-colors"
                onClick={() => setExpanded(v => !v)}
            >
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                API Inspector
                <span className="text-xs font-normal normal-case">
                    ({postCount} POST, {getCount} GET)
                </span>
            </button>
            {expanded && (
                <div className="mt-2 space-y-1 max-h-96 overflow-y-auto font-mono text-xs">
                    {logs.map((entry) => (
                        <DebugLogEntry_ key={entry.id} entry={entry} />
                    ))}
                </div>
            )}
        </div>
    );
};
