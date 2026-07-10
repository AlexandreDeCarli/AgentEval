import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Plus, Play, Search, Target, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { MissionCard } from '../../../components/MissionCard';
import { Project, Mission, TestRun } from '../../../types';
import {
    DEFAULT_MISSION_FILTERS,
    filterProjectMissions,
    getMissionFilterOptions,
    reconcileSelectedMissionIds,
} from '../missionFilters';

interface ProjectMissionsTabProps {
    project: Project;
    projectMissions: Mission[];
    onDelete: (mission: Mission) => void;
    onSelectRun: (run: TestRun) => void;
    onRunAll: (missions: Mission[]) => void;
}

export const ProjectMissionsTab: React.FC<ProjectMissionsTabProps> = ({
    project,
    projectMissions,
    onDelete,
    onSelectRun,
    onRunAll,
}) => {
    const navigate = useNavigate();
    const [filters, setFilters] = useState(DEFAULT_MISSION_FILTERS);
    const [selectedMissionIds, setSelectedMissionIds] = useState<string[]>([]);

    const { environmentOptions, systemPromptOptions } = useMemo(
        () => getMissionFilterOptions(project),
        [project]
    );

    const filteredMissions = useMemo(
        () => filterProjectMissions(projectMissions, filters),
        [projectMissions, filters]
    );

    const selectedVisibleMissions = useMemo(
        () => filteredMissions.filter((mission) => selectedMissionIds.includes(mission.id)),
        [filteredMissions, selectedMissionIds]
    );

    const hasActiveFilters =
        filters.query.trim() !== '' ||
        filters.environmentId !== 'all' ||
        filters.systemPromptId !== 'all';
    const hasSelection = selectedVisibleMissions.length > 0;
    const runTargetMissions = hasSelection ? selectedVisibleMissions : filteredMissions;

    useEffect(() => {
        setSelectedMissionIds((current) => reconcileSelectedMissionIds(current, projectMissions));
    }, [projectMissions]);

    const handleSelectionChange = (missionId: string, selected: boolean) => {
        setSelectedMissionIds((current) => {
            if (selected) {
                return current.includes(missionId) ? current : [...current, missionId];
            }
            return current.filter((id) => id !== missionId);
        });
    };

    const handleSelectVisible = () => {
        setSelectedMissionIds(filteredMissions.map((mission) => mission.id));
    };

    const handleClearSelection = () => {
        setSelectedMissionIds([]);
    };

    const handleClearFilters = () => {
        setFilters(DEFAULT_MISSION_FILTERS);
    };

    return (
        <div className="space-y-6">
            {/* Mission Header Summary */}
            {projectMissions.length > 0 && (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between select-none">
                    <h3 className="text-label text-white flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />
                        Registered Scenarios ({filteredMissions.length}/{projectMissions.length})
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            onClick={() => navigate('/missions/new?project=' + project.id)}
                            className="gap-2 bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] hover:scale-[1.02] active:scale-[0.98] text-white font-bold text-xs uppercase shadow-lg cursor-pointer"
                        >
                            <Plus className="w-4 h-4" /> New Mission
                        </Button>
                        <Button
                            onClick={() => onRunAll(runTargetMissions)}
                            disabled={runTargetMissions.length === 0}
                            className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg cursor-pointer text-xs font-bold uppercase"
                        >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            {hasSelection ? `Run Selected (${selectedVisibleMissions.length})` : `Run All (${filteredMissions.length})`}
                        </Button>
                    </div>
                </div>
            )}

            {projectMissions.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-[#1C2026] p-4 space-y-4">
                    <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-end 2xl:justify-between">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 flex-1">
                            <label className="space-y-1.5">
                                <span className="text-label text-muted-foreground flex items-center gap-1.5">
                                    <Search className="w-3.5 h-3.5" /> Find mission
                                </span>
                                <Input
                                    value={filters.query}
                                    onChange={(event) =>
                                        setFilters((current) => ({ ...current, query: event.target.value }))
                                    }
                                    placeholder="Search title or goal..."
                                    aria-label="Search missions by title or goal"
                                />
                            </label>

                            <label className="space-y-1.5">
                                <span className="text-label text-muted-foreground flex items-center gap-1.5">
                                    <Filter className="w-3.5 h-3.5" /> Environment
                                </span>
                                <select
                                    value={filters.environmentId}
                                    onChange={(event) =>
                                        setFilters((current) => ({ ...current, environmentId: event.target.value }))
                                    }
                                    className="h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A72FF] focus-visible:border-[#4A72FF]"
                                    aria-label="Filter missions by environment"
                                >
                                    <option value="all">All environments</option>
                                    {environmentOptions.map((environment) => (
                                        <option key={environment.id} value={environment.id}>
                                            {environment.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="space-y-1.5">
                                <span className="text-label text-muted-foreground flex items-center gap-1.5">
                                    <Target className="w-3.5 h-3.5" /> System prompt
                                </span>
                                <select
                                    value={filters.systemPromptId}
                                    onChange={(event) =>
                                        setFilters((current) => ({ ...current, systemPromptId: event.target.value }))
                                    }
                                    className="h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A72FF] focus-visible:border-[#4A72FF]"
                                    aria-label="Filter missions by system prompt"
                                >
                                    <option value="all">All prompts</option>
                                    {systemPromptOptions.map((prompt) => (
                                        <option key={prompt.id} value={prompt.id}>
                                            {prompt.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSelectVisible}
                                disabled={filteredMissions.length === 0}
                                className="text-xs"
                            >
                                Select visible
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearSelection}
                                disabled={selectedMissionIds.length === 0}
                                className="text-xs"
                            >
                                Clear selection
                            </Button>
                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearFilters}
                                    className="gap-1 text-xs text-muted-foreground hover:text-white"
                                >
                                    <X className="w-3.5 h-3.5" /> Clear filters
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-label text-muted-foreground">
                        <span>{filteredMissions.length} visible</span>
                        <span className="text-border">/</span>
                        <span>{selectedVisibleMissions.length} selected</span>
                        {hasActiveFilters && (
                            <>
                                <span className="text-border">/</span>
                                <span>Batch run is scoped to the current filter</span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Scenario Cards */}
            <div id="project-missions-list" className="grid grid-cols-1 gap-4">
                {filteredMissions.map((mission) => (
                    <MissionCard
                        key={mission.id}
                        mission={mission}
                        onDelete={onDelete}
                        onSelectRun={onSelectRun}
                        isSelected={selectedMissionIds.includes(mission.id)}
                        onSelectionChange={handleSelectionChange}
                        selectionLabel={`Select mission ${mission.titulo} for batch run`}
                    />
                ))}

                {projectMissions.length > 0 && filteredMissions.length === 0 && (
                    <div className="py-10 text-center border border-dashed border-border/60 bg-[#1C2026]/40 rounded-2xl select-none">
                        <p className="text-body text-white font-bold mb-1">No missions match these filters.</p>
                        <p className="text-body text-muted-foreground mb-4">
                            Adjust the search, environment, or system prompt before running a batch.
                        </p>
                        <Button variant="outline" onClick={handleClearFilters} className="gap-2">
                            <X className="w-4 h-4" /> Clear filters
                        </Button>
                    </div>
                )}

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
