import React, { useState } from 'react';
import { useMissionStore } from '../store/useMissionStore';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Upload } from 'lucide-react';
import { Mission } from '../types';
import { MissionCard } from '../components/MissionCard';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { useToastStore } from '../store/useToastStore';

export const MissionList: React.FC = () => {
    const { missions, deleteMission, addMission, importMissions } = useMissionStore();
    const navigate = useNavigate();
    const [missionToDelete, setMissionToDelete] = useState<Mission | null>(null);
    const addToast = useToastStore((state) => state.addToast);

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
                    addToast(`${imported.length} missions imported successfully!`, 'success');
                } else {
                    addToast('Invalid file format. Expected a JSON array of missions.', 'error');
                }
            } catch {
                addToast('Error parsing JSON file.', 'error');
            }
        };
        reader.readAsText(file);
    };

    const handleClone = (mission: Mission) => {
        const cloned: Mission = {
            ...mission,
            id: crypto.randomUUID(),
            titulo: `${mission.titulo} (Copy)`
        };
        addMission(cloned);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8 select-none">
                <div>
                    <h1 className="text-display text-white">Mission Board</h1>
                    <p className="text-body text-muted-foreground mt-1">Manage your target agent test scenarios.</p>
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

            <div className="grid grid-cols-1 gap-4">
                {missions.map((mission) => (
                    <MissionCard
                        key={mission.id}
                        mission={mission}
                        onDelete={setMissionToDelete}
                        onClone={handleClone}
                    />
                ))}
                {missions.length === 0 && (
                    <div className="py-12 text-center border-2 border-dashed border-border rounded-xl">
                        <p className="text-body text-muted-foreground mb-4">No missions created yet.</p>
                        <Button onClick={() => navigate('/missions/new')} variant="outline">Create your first Mission</Button>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {missionToDelete && (
                <ConfirmDeleteModal
                    itemType="Mission"
                    itemName={missionToDelete.titulo}
                    warningDescription="The mission scenario, behavior parameters, and all associated test execution histories will be permanently deleted."
                    onConfirm={() => {
                        deleteMission(missionToDelete.id);
                        setMissionToDelete(null);
                    }}
                    onCancel={() => setMissionToDelete(null)}
                />
            )}
        </div>
    );
};
