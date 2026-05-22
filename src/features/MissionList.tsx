import React, { useState } from 'react';
import { useMissionStore } from '../store/useMissionStore';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Edit, Trash2, Copy, Download, Upload } from 'lucide-react';
import { Mission } from '../types';

export const MissionList: React.FC = () => {
    const { missions, deleteMission, addMission, importMissions } = useMissionStore();
    const navigate = useNavigate();
    const [missionToDelete, setMissionToDelete] = useState<Mission | null>(null);

    const handleExport = () => {
        const dataStr = JSON.stringify(missions, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const exportFileDefaultName = 'missions_export.json';
        
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.download = exportFileDefaultName;
        linkElement.style.display = 'none';
        
        // Chrome requires the link to be in the DOM to trigger a download
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Allow re-importing the same file consecutively by resetting the input immediately.
        e.target.value = '';
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const rawResult = event.target?.result;
                const imported = JSON.parse(typeof rawResult === 'string' ? rawResult : 'null');
                if (Array.isArray(imported)) {
                    importMissions(imported as Mission[]);
                    alert(`${imported.length} missions imported successfully!`);
                } else {
                    alert('Invalid file format. Expected a JSON array of missions.');
                }
            } catch {
                alert('Error parsing JSON file.');
            }
        };
        reader.readAsText(file);
    };

    const handleClone = (mission: Mission) => {
        const cloned: Mission = {
            ...mission,
            id: crypto.randomUUID(),
            titulo: `${mission.titulo} (Cópia)`
        };
        addMission(cloned);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mission Board</h1>
                    <p className="text-muted-foreground mt-1">Manage your target agent test scenarios.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <input
                            type="file"
                            id="import-missions"
                            className="hidden"
                            accept=".json"
                            onChange={handleImport}
                        />
                        <Button variant="outline" onClick={() => document.getElementById('import-missions')?.click()} className="gap-2">
                            <Upload className="w-4 h-4" /> Import
                        </Button>
                    </div>
                    <Button variant="outline" onClick={handleExport} className="gap-2">
                        <Download className="w-4 h-4" /> Export All
                    </Button>
                    <Button onClick={() => navigate('/missions/new')} className="gap-2">
                        <Plus className="w-4 h-4" /> New Mission
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {missions.map((mission) => (
                    <div key={mission.id} className="border border-border bg-card text-card-foreground rounded-xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-6 flex-1">
                            <h3 className="text-lg font-semibold leading-none mb-3">{mission.titulo}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                                {mission.mission_goal}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {Object.keys(mission.variables || {}).map(v => (
                                    <span key={v} className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-md">
                                        {`{{${v}}}`}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="bg-muted p-4 border-t border-border flex items-center justify-between">
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => navigate(`/missions/${mission.id}`)} title="Edit">
                                    <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleClone(mission)} title="Clone">
                                    <Copy className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setMissionToDelete(mission)} className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                            <Button size="sm" onClick={() => navigate(`/run/${mission.id}`)} className="gap-1 bg-green-600 hover:bg-green-700 text-white">
                                <Play className="w-4 h-4 fill-current" /> Run Test
                            </Button>
                        </div>
                    </div>
                ))}
                {missions.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-xl">
                        <p className="text-muted-foreground mb-4">No missions created yet.</p>
                        <Button onClick={() => navigate('/missions/new')} variant="outline">Create your first Mission</Button>
                    </div>
                )}
            </div>

            {/* Modal de Confirmação de Exclusão de Missão */}
            {missionToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop com blur e animação suave */}
                    <div 
                        className="absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-300 animate-modal-fade-in cursor-pointer"
                        onClick={() => setMissionToDelete(null)}
                    />
                    
                    {/* Caixa do Modal Premium */}
                    <div className="relative bg-gradient-to-b from-[#111827] to-[#0b0f19] border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.8),_inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl max-w-sm w-full p-6 z-10 animate-modal-scale-in overflow-hidden text-center space-y-6">
                        {/* Linha de brilho superior destrutivo */}
                        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                        
                        {/* Ícone de aviso destrutivo com efeitos de luz */}
                        <div className="relative flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                            <div className="absolute inset-0 rounded-full bg-red-500/5 animate-ping opacity-75" />
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        
                        {/* Texto descritivo principal */}
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold tracking-tight text-white">Excluir Missão?</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Você está prestes a excluir permanentemente a missão:
                            </p>
                            <div className="inline-block font-semibold text-white bg-slate-900/60 border border-white/5 px-3 py-1 rounded-lg text-sm max-w-full truncate shadow-inner">
                                "{missionToDelete.titulo}"
                            </div>
                        </div>

                        {/* Card de Aviso Crítico com design moderno */}
                        <div className="bg-red-500/[0.03] border-l-2 border-red-500/60 p-4 rounded-r-lg text-left space-y-1">
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">⚠️ Ação Irreversível</span>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                O cenário da missão, os parâmetros de comportamento e todo o histórico de execuções de testes associados serão **deletados para sempre**.
                            </p>
                        </div>
                        
                        {/* Botões de Ação Simétricos e Táteis */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setMissionToDelete(null)}
                                className="flex-1 px-4 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-semibold text-xs tracking-wide uppercase transition-all duration-200 cursor-pointer active:scale-[0.98] border-b-[2px] border-b-black/20 hover:border-white/[0.12]"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    deleteMission(missionToDelete.id);
                                    setMissionToDelete(null);
                                }}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-bold text-xs tracking-wide uppercase shadow-[0_4px_12px_rgba(239,68,68,0.25)] hover:shadow-[0_4px_16px_rgba(239,68,68,0.35)] hover:-translate-y-[1px] transition-all duration-200 cursor-pointer active:scale-[0.98] active:translate-y-0"
                            >
                                Sim, Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
