import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Target } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { MissionCard } from '../../../components/MissionCard';
import { Project, Mission, TestRun } from '../../../types';

interface ProjectMissionsTabProps {
    project: Project;
    projectMissions: Mission[];
    onDelete: (mission: Mission) => void;
    onSelectRun: (run: TestRun) => void;
    onRunAll: () => void;
}

export const ProjectMissionsTab: React.FC<ProjectMissionsTabProps> = ({
    project,
    projectMissions,
    onDelete,
    onSelectRun,
    onRunAll,
}) => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            {/* Mission Header Summary */}
            {projectMissions.length > 0 && (
                <div className="flex justify-between items-center select-none">
                    <h3 className="text-label text-white flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />
                        Registered Scenarios ({projectMissions.length})
                    </h3>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => navigate('/missions/new?project=' + project.id)}
                            className="gap-2 bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] hover:scale-[1.02] active:scale-[0.98] text-white font-bold text-xs uppercase shadow-lg cursor-pointer"
                        >
                            <Plus className="w-4 h-4" /> New Mission
                        </Button>
                        <Button
                            onClick={onRunAll}
                            className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg cursor-pointer text-xs font-bold uppercase"
                        >
                            <Play className="w-3.5 h-3.5 fill-current" /> Run All Scenarios
                        </Button>
                    </div>
                </div>
            )}

            {/* Scenario Cards */}
            <div id="project-missions-list" className="grid grid-cols-1 gap-4">
                {projectMissions.map((mission) => (
                    <MissionCard
                        key={mission.id}
                        mission={mission}
                        onDelete={onDelete}
                        onSelectRun={onSelectRun}
                    />
                ))}

                {projectMissions.length === 0 && (
                    <div className="py-12 text-center border-2 border-dashed border-border/50 bg-[#1C2026]/40 rounded-2xl select-none">
                        <p className="text-body text-muted-foreground mb-4">
                            No missions created for this project yet.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button
                                onClick={() => navigate('/missions/new?project=' + project.id)}
                                className="gap-2 bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] text-white font-bold text-xs uppercase shadow-md cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform"
                            >
                                <Plus className="w-4 h-4" /> Create New Mission
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
