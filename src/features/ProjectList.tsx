import React, { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { useMissionStore } from '../store/useMissionStore';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, FolderOpen, FileText, Server, Target } from 'lucide-react';
import { DEFAULT_GEMINI_TARGET_MODEL } from '../utils/missionTarget';
import { Project } from '../types';

export const ProjectList: React.FC = () => {
    const { projects, deleteProject, addProject } = useProjectStore();
    const { missions } = useMissionStore();
    const navigate = useNavigate();
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

    const handleNew = () => {
        const id = crypto.randomUUID();
        addProject({
            id,
            name: 'New Project',
            description: '',
            documentation: '',
            target_provider: 'http',
            target_gemini_model: DEFAULT_GEMINI_TARGET_MODEL,
            system_prompts: [],
            environments: [],
        });
        
        // Se o tour do painel estiver rodando, sinaliza que devemos disparar o tutorial de projetos na nova página
        const isTourRunning = sessionStorage.getItem('dashboardTourRunning') === 'true';
        if (isTourRunning) {
            sessionStorage.setItem('autoStartProjectTour', 'true');
        }
        
        navigate(`/projects/${id}`);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-8 select-none">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase">Projects</h1>
                    <p className="text-xs text-muted-foreground mt-1 tracking-wider font-bold uppercase">Organize missions by project and environment.</p>
                </div>
                <Button 
                    id="new-project-button" 
                    onClick={handleNew} 
                    className="gap-2 bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-white font-bold text-xs uppercase shadow-lg shadow-[#4A72FF]/10 cursor-pointer"
                >
                    <Plus className="w-4 h-4" /> New Project
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => {
                    const projectMissions = missions.filter((m) => m.project_id === project.id);
                    return (
                        <div
                            key={project.id}
                            className="border border-border/50 bg-[#1C2026] rounded-2xl p-6 hover:border-[#4A72FF]/40 hover:bg-[#272D35]/25 transition-all duration-300 shadow-sm flex flex-col justify-between group h-full relative overflow-hidden"
                        >
                            {/* Accent Glow Line */}
                            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#8B5CF6]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#4A72FF]/10 border border-[#4A72FF]/20 text-[#4A72FF] group-hover:scale-105 transition-transform duration-200">
                                        <FolderOpen className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-bold text-white leading-tight truncate group-hover:text-[#4A72FF] transition-colors duration-200">{project.name}</h3>
                                        <span className="text-[9px] text-muted-foreground font-bold tracking-wider uppercase">Active Project</span>
                                    </div>
                                </div>
                                
                                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed min-h-[48px]">
                                    {project.description || 'No description provided. Define system prompts and environments to start evaluating your agents.'}
                                </p>
                                
                                <div className="flex flex-wrap gap-2 pt-2 select-none">
                                    <span className="flex items-center gap-1.5 bg-[#272D35]/50 border border-white/[0.04] text-slate-300 text-[10px] font-extrabold tracking-wider px-2.5 py-1 rounded-lg">
                                        <FileText className="w-3.5 h-3.5 text-zinc-500" />
                                        {project.system_prompts.length} Prompts
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-[#272D35]/50 border border-white/[0.04] text-slate-300 text-[10px] font-extrabold tracking-wider px-2.5 py-1 rounded-lg">
                                        <Server className="w-3.5 h-3.5 text-zinc-500" />
                                        {project.environments.length} Envs
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-[#272D35]/50 border border-white/[0.04] text-slate-300 text-[10px] font-extrabold tracking-wider px-2.5 py-1 rounded-lg">
                                        <Target className="w-3.5 h-3.5 text-zinc-500" />
                                        {projectMissions.length} Missions
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-6 border-t border-white/[0.04] mt-6 select-none">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setProjectToDelete(project)}
                                    className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer h-9 w-9 p-0 flex items-center justify-center rounded-lg transition-all duration-200"
                                    title="Delete Project"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                                <Button
                                    onClick={() => navigate(`/projects/${project.id}`)}
                                    className="gap-1.5 bg-white/[0.04] hover:bg-gradient-to-r hover:from-[#4A72FF] hover:to-[#8B5CF6] border border-white/[0.08] hover:border-transparent text-white font-bold text-xs uppercase px-4 py-2 rounded-lg cursor-pointer active:scale-[0.97] transition-all duration-200 shadow-sm"
                                >
                                    Open Project
                                </Button>
                            </div>
                        </div>
                    );
                })}
                {projects.length === 0 && (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-border/50 bg-[#1C2026]/40 rounded-2xl select-none animate-fade-in">
                        <FolderOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground mb-4 text-xs font-semibold">No projects yet. Create one to organize your missions.</p>
                        <Button 
                            onClick={handleNew} 
                            className="gap-2 bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] hover:scale-[1.02] active:scale-[0.98] transition-all text-white font-bold text-xs uppercase px-4 py-2 rounded-lg shadow-md cursor-pointer"
                        >
                            <Plus className="w-4 h-4" /> Create your first Project
                        </Button>
                    </div>
                )}
            </div>

            {/* Modal de Confirmação de Exclusão de Projeto */}
            {projectToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop com blur e animação suave */}
                    <div 
                        className="absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-300 animate-modal-fade-in cursor-pointer"
                        onClick={() => setProjectToDelete(null)}
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
                            <h3 className="text-xl font-bold tracking-tight text-white">Delete Project?</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                You are about to permanently delete the project:
                            </p>
                            <div className="inline-block font-semibold text-white bg-slate-900/60 border border-white/5 px-3 py-1 rounded-lg text-sm max-w-full truncate shadow-inner">
                                "{projectToDelete.name}"
                            </div>
                        </div>

                        {/* Card de Aviso Crítico com design moderno */}
                        <div className="bg-red-500/[0.03] border-l-2 border-red-500/60 p-4 rounded-r-lg text-left space-y-1">
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">⚠️ Irreversible Action</span>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                All associated missions, custom prompts, environment configurations, and execution logs will be **permanently deleted** from the server and localStorage.
                            </p>
                        </div>
                        
                        {/* Botões de Ação Simétricos e Táteis */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setProjectToDelete(null)}
                                className="flex-1 px-4 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-semibold text-xs tracking-wide uppercase transition-all duration-200 cursor-pointer active:scale-[0.98] border-b-[2px] border-b-black/20 hover:border-white/[0.12]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    deleteProject(projectToDelete.id);
                                    setProjectToDelete(null);
                                }}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-bold text-xs tracking-wide uppercase shadow-[0_4px_12px_rgba(239,68,68,0.25)] hover:shadow-[0_4px_16px_rgba(239,68,68,0.35)] hover:-translate-y-[1px] transition-all duration-200 cursor-pointer active:scale-[0.98] active:translate-y-0"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
