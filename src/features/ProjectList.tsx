import React, { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { useMissionStore } from '../store/useMissionStore';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, FolderOpen, FileText, Server, Target } from 'lucide-react';
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
            name: 'Novo Projeto',
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
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                    <p className="text-muted-foreground mt-1">Organize missions by project and environment.</p>
                </div>
                <Button id="new-project-button" onClick={handleNew} className="gap-2">
                    <Plus className="w-4 h-4" /> New Project
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => {
                    const projectMissions = missions.filter((m) => m.project_id === project.id);
                    return (
                        <div
                            key={project.id}
                            className="border border-border bg-card text-card-foreground rounded-xl shadow-sm overflow-hidden flex flex-col"
                        >
                            <div className="p-6 flex-1">
                                <div className="flex items-center gap-2 mb-3">
                                    <FolderOpen className="w-5 h-5 text-primary" />
                                    <h3 className="text-lg font-semibold leading-none">{project.name}</h3>
                                </div>
                                {project.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                        {project.description}
                                    </p>
                                )}
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <FileText className="w-3.5 h-3.5" />
                                        {project.system_prompts.length} prompts
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Server className="w-3.5 h-3.5" />
                                        {project.environments.length} envs
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Target className="w-3.5 h-3.5" />
                                        {projectMissions.length} missions
                                    </span>
                                </div>
                            </div>
                            <div className="bg-muted p-4 border-t border-border flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setProjectToDelete(project)}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => navigate(`/projects/${project.id}`)}
                                    className="gap-1"
                                >
                                    <Edit className="w-4 h-4" /> Open
                                </Button>
                            </div>
                        </div>
                    );
                })}
                {projects.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-xl">
                        <p className="text-muted-foreground mb-4">No projects yet. Create one to organize your missions.</p>
                        <Button onClick={handleNew} variant="outline">
                            Create your first Project
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
                            <h3 className="text-xl font-bold tracking-tight text-white">Excluir Projeto?</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Você está prestes a excluir permanentemente o projeto:
                            </p>
                            <div className="inline-block font-semibold text-white bg-slate-900/60 border border-white/5 px-3 py-1 rounded-lg text-sm max-w-full truncate shadow-inner">
                                "{projectToDelete.name}"
                            </div>
                        </div>

                        {/* Card de Aviso Crítico com design moderno */}
                        <div className="bg-red-500/[0.03] border-l-2 border-red-500/60 p-4 rounded-r-lg text-left space-y-1">
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">⚠️ Ação Irreversível</span>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Todas as missões associadas, prompts personalizados, configurações de ambiente e logs de execução serão **excluídos permanentemente** do servidor e do localStorage.
                            </p>
                        </div>
                        
                        {/* Botões de Ação Simétricos e Táteis */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setProjectToDelete(null)}
                                className="flex-1 px-4 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white font-semibold text-xs tracking-wide uppercase transition-all duration-200 cursor-pointer active:scale-[0.98] border-b-[2px] border-b-black/20 hover:border-white/[0.12]"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    deleteProject(projectToDelete.id);
                                    setProjectToDelete(null);
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
