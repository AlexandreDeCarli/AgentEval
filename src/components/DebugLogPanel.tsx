import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { DebugLogEntry } from '../types';

export const HighlightedJson: React.FC<{ value: any }> = ({ value }) => {
    const html = useMemo(() => {
        if (value === undefined || value === null) return '<span class="text-zinc-500">null</span>';
        let jsonStr = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
        
        // Escape HTML to prevent XSS
        jsonStr = jsonStr
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Avoid running heavy regex on extremely large payloads to prevent UI freezing
        if (jsonStr.length > 50000) {
            return jsonStr;
        }
        
        const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;
        
        return jsonStr.replace(regex, (match) => {
            let cls = 'text-amber-400'; // numbers
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'text-indigo-400 font-bold'; // keys
                } else {
                    cls = 'text-emerald-400'; // strings
                }
            } else if (/true|false/.test(match)) {
                cls = 'text-rose-400 font-bold'; // booleans
            } else if (/null/.test(match)) {
                cls = 'text-zinc-500'; // null
            }
            return `<span class="${cls}">${match}</span>`;
        });
    }, [value]);

    return (
        <pre 
            className="text-zinc-300 whitespace-pre-wrap break-all leading-relaxed text-xs font-mono bg-zinc-950/80 p-3 rounded-lg border border-zinc-800/80"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
};

export const DebugLogEntry_: React.FC<{ entry: DebugLogEntry }> = ({ entry }) => {
    const [expanded, setExpanded] = useState(false);
    const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isOk = entry.status >= 200 && entry.status < 300;
    const methodColor = entry.type === 'POST' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    const statusColor = isOk ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20';

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden shadow-sm hover:border-zinc-700/60 transition-all duration-200">
            <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/35 transition-colors text-left text-xs"
                onClick={() => setExpanded(v => !v)}
            >
                {expanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500 flex-none" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500 flex-none" />}
                <span className="text-zinc-500 font-medium select-none">{time}</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase border select-none ${methodColor}`}>{entry.type}</span>
                <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] border select-none ${statusColor}`}>{entry.status}</span>
                <span className="text-zinc-300 truncate font-semibold flex-1 font-mono">{entry.url}</span>
                <span className="text-zinc-500 flex-none font-medium select-none">{entry.duration}ms</span>
            </button>
            {expanded && (
                <div className="border-t border-zinc-800 bg-zinc-900/60 p-4 space-y-4 animate-fade-in">
                    {entry.requestBody !== undefined && (
                        <div className="space-y-1.5">
                            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider select-none">Request Body</div>
                            <HighlightedJson value={entry.requestBody} />
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider select-none">Response</div>
                        <HighlightedJson value={entry.response} />
                    </div>
                </div>
            )}
        </div>
    );
};

export const DebugLogPanel: React.FC<{ logs: DebugLogEntry[] }> = ({ logs }) => {
    if (!logs || logs.length === 0) {
        return (
            <div className="text-xs text-muted-foreground bg-[#1C2026]/40 border border-dashed border-border/60 rounded-xl p-8 text-center select-none flex flex-col items-center justify-center gap-2 animate-fade-in">
                <span>No API requests recorded for this execution.</span>
            </div>
        );
    }

    return (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {logs.map((entry) => (
                <DebugLogEntry_ key={entry.id} entry={entry} />
            ))}
        </div>
    );
};
