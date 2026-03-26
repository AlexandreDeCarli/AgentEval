import React from 'react';
import { useMissionStore } from '../store/useMissionStore';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Edit, Trash2, Copy, Download, Upload } from 'lucide-react';

export const MissionList: React.FC = () => {
    const { missions, deleteMission, addMission, importMissions } = useMissionStore();
    const navigate = useNavigate();

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

        // Intentionally do not immediately revoke the object URL.
        // If the user has Chrome set to "Ask where to save each file",
        // revoking it too soon will cause an ERR_FILE_NOT_FOUND error
        // when they finally click "Save". 
        // Modern browsers will clean this up when the page unloads.
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Allow re-importing the same file consecutively by resetting the input immediately.
        e.target.value = '';
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                if (Array.isArray(imported)) {
                    importMissions(imported);
                    alert(`${imported.length} missions imported successfully!`);
                } else {
                    alert('Invalid file format. Expected a JSON array of missions.');
                }
            } catch (err) {
                alert('Error parsing JSON file.');
            }
        };
        reader.readAsText(file);
    };

    const handleClone = (mission: any) => {
        const cloned = {
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
                                <Button variant="ghost" size="sm" onClick={() => deleteMission(mission.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete">
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
        </div>
    );
};
