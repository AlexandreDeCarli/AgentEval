import React, { useCallback, useRef } from 'react';
import { Download, ShieldAlert, Upload } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { createConfigurationExport, parseConfigurationExport } from '../../services/configurationTransfer';
import { useMissionStore } from '../../store/useMissionStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useToastStore } from '../../store/useToastStore';

export const WorkspaceMigrationSettings: React.FC = () => {
    const projects = useProjectStore((state) => state.projects);
    const missions = useMissionStore((state) => state.missions);
    const { geminiApiKey, evaluatorModel, setGeminiApiKey, setEvaluatorModel } = useSettingsStore();
    const addToast = useToastStore((state) => state.addToast);
    const importInputRef = useRef<HTMLInputElement>(null);

    const handleExport = useCallback(() => {
        const exported = createConfigurationExport({
            projects,
            missions,
            settings: { geminiApiKey, evaluatorModel },
        });
        const url = URL.createObjectURL(
            new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' })
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = `agenteval-config-${new Date().toISOString().slice(0, 10)}.json`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(() => URL.revokeObjectURL(url), 100);
        addToast('Configuration export generated. Histories and usage were not included.', 'success');
    }, [addToast, evaluatorModel, geminiApiKey, missions, projects]);

    const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            try {
                const raw = readerEvent.target?.result;
                const imported = parseConfigurationExport(typeof raw === 'string' ? raw : '');
                useProjectStore.setState({ projects: imported.projects });
                useMissionStore.setState({ missions: imported.missions });
                setGeminiApiKey(imported.settings.geminiApiKey);
                setEvaluatorModel(imported.settings.evaluatorModel);
                addToast(
                    `Imported ${imported.projects.length} projects and ${imported.missions.length} missions. Histories and usage were unchanged.`,
                    'success',
                    6000
                );
            } catch (error) {
                addToast(
                    error instanceof Error ? error.message : 'Unable to import configuration file.',
                    'error',
                    6000
                );
            }
        };
        reader.onerror = () => addToast('Unable to read configuration file.', 'error');
        reader.readAsText(file);
    }, [addToast, setEvaluatorModel, setGeminiApiKey]);

    return (
        <section className="max-w-3xl border border-border bg-card rounded-xl p-6 space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                    <h2 className="text-title flex items-center gap-2">
                        <Upload className="w-5 h-5 text-primary" /> Workspace Migration
                    </h2>
                    <p className="text-body text-muted-foreground max-w-[75ch]">
                        Move projects, missions, and global settings between AgentEval workspaces.
                        Test histories, run logs, and AI usage remain local.
                    </p>
                </div>
                <div className="flex shrink-0 gap-3">
                    <Button variant="outline" onClick={handleExport} className="gap-2">
                        <Download className="w-4 h-4" /> Export
                    </Button>
                    <Button onClick={() => importInputRef.current?.click()} className="gap-2">
                        <Upload className="w-4 h-4" /> Import
                    </Button>
                </div>
            </div>
            <input
                ref={importInputRef}
                type="file"
                className="hidden"
                accept="application/json,.json"
                onChange={handleImport}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                    ['Projects', projects.length],
                    ['Missions', missions.length],
                    ['Usage ledger', 'Excluded'],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-border/60 bg-background/60 px-4 py-3">
                        <span className="text-label text-muted-foreground">{label}</span>
                        <div className="mt-1 text-title text-white">{value}</div>
                    </div>
                ))}
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-4 flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                <p className="text-body text-amber-100/90">
                    Import replaces projects, missions, and settings. Usage and histories are kept,
                    and exported files include configuration secrets.
                </p>
            </div>
        </section>
    );
};
