import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Project } from '../../../types';

interface SettingsDocsSubTabProps {
    project: Project;
    onChange: (project: Project) => void;
}

export const SettingsDocsSubTab: React.FC<SettingsDocsSubTabProps> = ({
    project,
    onChange,
}) => {
    return (
        <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card shadow-sm">
            <div className="flex justify-between items-center border-b border-border/40 pb-2 mb-2 select-none">
                <h2 className="text-title text-white flex items-center gap-1.5">
                    <span>Project Documentation (Markdown)</span>
                    <span title="Enter or paste your domain/product's Markdown documentation. The evaluator will automatically read this context to verify domain-specific rules and instructions.">
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                    </span>
                </h2>
                <span className="text-label text-muted-foreground bg-[#272D35] px-2.5 py-1 rounded border border-border/50 font-mono font-bold tabular-nums">
                    {project.documentation?.length || 0} CHARS
                </span>
            </div>
            <p className="text-body text-muted-foreground">
                Paste the full documentation of the target system here. The AI will use
                it to generate intelligent test missions.
            </p>
            <textarea
                className="w-full h-[62vh] font-mono rounded-lg border border-[#2D3036] bg-[#13161B] px-4 py-3 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A72FF]"
                value={project.documentation}
                onChange={(e) =>
                    onChange({ ...project, documentation: e.target.value })
                }
                placeholder="# System Documentation&#10;&#10;Paste the complete documentation of the target system here..."
            />
        </section>
    );
};
