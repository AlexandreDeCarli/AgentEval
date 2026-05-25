import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Play, Trash2, Copy } from 'lucide-react';
import { Mission } from '../types';
import { useProjectStore } from '../store/useProjectStore';
import { useTestRunStore } from '../store/useTestRunStore';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
    getProjectTargetProvider,
    getProjectGeminiModel,
} from '../utils/missionTarget';

interface MissionCardProps {
    mission: Mission;
    onDelete: (mission: Mission) => void;
    onClone?: (mission: Mission) => void;
    onSelectRun?: (run: any) => void;
}

export const MissionCard: React.FC<MissionCardProps> = ({
    mission,
    onDelete,
    onClone,
    onSelectRun,
}) => {
    const navigate = useNavigate();
    const { projects } = useProjectStore();
    const { runs } = useTestRunStore();

    // Find associated project
    const project = projects.find((p) => p.id === mission.project_id);

    // Resolve system prompt and environment name
    const prompt = project?.system_prompts?.find((sp) => sp.id === mission.system_prompt_id);
    const env = project?.environments?.find((e) => e.id === mission.environment_id);

    // Target configuration (supporting gemini project settings/mission overrides)
    const targetProvider = mission.target_provider || getProjectTargetProvider(project || undefined);
    const targetGeminiModel = mission.target_gemini_model || getProjectGeminiModel(project || undefined);

    // Get the last 3 completed runs for the stability pills
    const missionRuns = runs
        .filter((r) => r.mission_id === mission.id && r.status !== 'running')
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, 3);

    return (
        <div className="border border-border/50 rounded-xl bg-[#1C2026] p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:border-[#4A72FF]/40 hover:bg-[#272D35]/20 transition-all duration-300 shadow-sm gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                    <h4 className="font-bold text-sm text-white truncate">
                        {mission.titulo}
                    </h4>
                    
                    {/* Project association label if viewed globally */}
                    {!onSelectRun && project && (
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700/60 font-semibold select-none">
                            {project.name}
                        </span>
                    )}

                    {/* Historic stability badges */}
                    {missionRuns.length > 0 && (
                        <div className="flex items-center gap-1">
                            {missionRuns.map((run) => {
                                const isSuccess = run.status === 'success';
                                const score = run.evaluation?.overall_score;
                                const displayScore = typeof score === 'number' ? score : '';
                                
                                return (
                                    <div
                                        key={run.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onSelectRun) {
                                                onSelectRun(run);
                                            } else {
                                                // If in global view, navigate to the run report page or open detailed view
                                                navigate(`/run/${mission.id}?run=${run.id}`);
                                            }
                                        }}
                                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border cursor-pointer hover:scale-105 active:scale-95 transition-all select-none ${
                                            isSuccess
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                                : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                                        }`}
                                        title={`Run on ${new Date(run.created_at).toLocaleString()}. Click to view details.`}
                                    >
                                        <span>{isSuccess ? '✓' : '✗'}</span>
                                        {displayScore !== '' && <span>{displayScore}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                <p className="text-xs text-muted-foreground line-clamp-1 mt-1.5 leading-relaxed">
                    {mission.mission_goal}
                </p>
                
                <div className="flex flex-wrap gap-2 mt-3 select-none">
                    {prompt && (
                        <Badge variant="secondary" className="text-[9px] uppercase tracking-wider font-extrabold bg-[#272D35] text-slate-300">
                            Prompt: {prompt.name}
                        </Badge>
                    )}
                    {targetProvider === 'gemini' ? (
                        <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-extrabold border-slate-700 text-slate-400">
                            Gemini · {targetGeminiModel}
                        </Badge>
                    ) : env && (
                        <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-extrabold border-slate-700 text-slate-400">
                            Env: {env.name}
                        </Badge>
                    )}
                    {Object.keys(mission.variables || {}).length > 0 && (
                        <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-extrabold border-slate-700 text-slate-400">
                            {Object.keys(mission.variables).length} vars
                        </Badge>
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-2 self-end sm:self-center ml-0 sm:ml-4 select-none">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/missions/${mission.id}`)}
                    className="h-8 cursor-pointer"
                    title="Edit Mission"
                >
                    <Pencil className="w-3.5 h-3.5" />
                </Button>
                {onClone && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onClone(mission)}
                        className="h-8 cursor-pointer"
                        title="Clone Mission"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </Button>
                )}
                <Button
                    size="sm"
                    onClick={() => navigate(`/run/${mission.id}`)}
                    className="gap-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xs uppercase h-8 cursor-pointer"
                >
                    <Play className="w-3.5 h-3.5 fill-current" /> Run
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(mission)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer h-8 w-8 p-0"
                    title="Delete"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    );
};
