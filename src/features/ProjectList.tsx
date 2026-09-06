import React, { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { useMissionStore } from '../store/useMissionStore';
import { Button } from '../components/ui/Button';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, FolderOpen, FileText, Server, Target } from 'lucide-react';
import { DEFAULT_GEMINI_TARGET_MODEL } from '../utils/missionTarget';
import { Project } from '../types';

import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

export const ProjectList: React.FC = () => {
    const { projects, deleteProject, addProject } = useProjectStore();
    const { missions } = useMissionStore();
    const navigate = useNavigate();
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

    // Create Project Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [newTargetProvider, setNewTargetProvider] = useState<'http' | 'gemini'>('http');

    const handleOpenNew = () => {
        const isTourRunning = sessionStorage.getItem('dashboardTourRunning') === 'true';
        if (isTourRunning) {
            handleCreate('New Project', '', 'http');
            return;
        }
        setNewProjectName('');
        setNewProjectDesc('');
        setNewTargetProvider('http');
        setIsCreateModalOpen(true);
    };

    const handleCreate = (name: string, description: string, targetProvider: 'http' | 'gemini') => {
        const id = crypto.randomUUID();
        addProject({
            id,
            name: name.trim() || 'New Project',
            description: description.trim(),
            documentation: '',
            target_provider: targetProvider,
            target_gemini_model: DEFAULT_GEMINI_TARGET_MODEL,
            system_prompts: [],
            environments: [],
        });

        setIsCreateModalOpen(false);

        const isTourRunning = sessionStorage.getItem('dashboardTourRunning') === 'true';
        if (isTourRunning) {
            sessionStorage.setItem('autoStartProjectTour', 'true');
        }

        navigate(`/projects/${id}?tab=settings`);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-8 select-none">
                <div>
                    <h1 className="text-display text-white">Projects</h1>
                    <p className="text-body text-muted-foreground mt-1">Organize missions by project and environment.</p>
                </div>
                <Button 
                    id="new-project-button" 
                    onClick={handleOpenNew} 
                    className="gap-2 bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-white font-bold text-xs shadow-lg shadow-[#4A72FF]/10 cursor-pointer"
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
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#4A72FF]/10 border border-[#4A72FF]/20 text-[#4A72FF]">
                                        <FolderOpen className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-title text-white truncate">{project.name}</h3>
                                        <span className="text-label text-muted-foreground">Active Project</span>
                                    </div>
                                </div>
                                
                                <p className="text-body text-slate-400 line-clamp-3 min-h-[48px]">
                                    {project.description || 'No description provided. Define system prompts and environments to start evaluating your agents.'}
                                </p>
                                
                                <div className="flex flex-wrap gap-2 pt-2 select-none">
                                    <span className="flex items-center gap-1.5 bg-[#272D35]/50 border border-white/[0.04] text-slate-300 text-label px-2.5 py-1 rounded-lg">
                                        <FileText className="w-3.5 h-3.5 text-zinc-500" />
                                        {project.system_prompts.length} Prompts
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-[#272D35]/50 border border-white/[0.04] text-slate-300 text-label px-2.5 py-1 rounded-lg">
                                        <Server className="w-3.5 h-3.5 text-zinc-500" />
                                        {project.environments.length} Envs
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-[#272D35]/50 border border-white/[0.04] text-slate-300 text-label px-2.5 py-1 rounded-lg">
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
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer h-9 w-9 p-0 flex items-center justify-center rounded-lg transition-all duration-200"
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
                        <p className="text-muted-foreground mb-4 text-body">No projects yet. Create one to organize your missions.</p>
                        <Button 
                            onClick={handleOpenNew} 
                            className="gap-2 bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] hover:scale-[1.02] active:scale-[0.98] transition-all text-white font-bold text-xs uppercase px-4 py-2 rounded-lg shadow-md cursor-pointer"
                        >
                            <Plus className="w-4 h-4" /> Create your first Project
                        </Button>
                    </div>
                )}
            </div>

            {/* Create Project Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Project"
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!newProjectName.trim()) return;
                        handleCreate(newProjectName, newProjectDesc, newTargetProvider);
                    }}
                    className="space-y-4"
                >
                    <div>
                        <label className="text-label text-slate-300 mb-1.5 block">Project Name *</label>
                        <Input
                            autoFocus
                            placeholder="e.g. Customer Support AI, Sales Assistant..."
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-label text-slate-300 mb-1.5 block">Description</label>
                        <textarea
                            className="w-full h-24 rounded-md border border-input bg-transparent px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            placeholder="Brief description of what this project tests..."
                            value={newProjectDesc}
                            onChange={(e) => setNewProjectDesc(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-label text-slate-300 mb-1.5 block">Target Provider</label>
                        <select
                            className="w-full h-10 rounded-md border border-input bg-[#1C2026] px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                            value={newTargetProvider}
                            onChange={(e) => setNewTargetProvider(e.target.value as 'http' | 'gemini')}
                        >
                            <option value="http">HTTP API (External agent endpoint)</option>
                            <option value="gemini">Gemini LLM (Direct model testing)</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsCreateModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!newProjectName.trim()}
                            className="bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] text-white font-bold px-5"
                        >
                            Create Project
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            {projectToDelete && (
                <ConfirmDeleteModal
                    itemType="Project"
                    itemName={projectToDelete.name}
                    warningDescription="All associated missions, custom prompts, environment configurations, and execution logs will be permanently deleted."
                    onConfirm={() => {
                        deleteProject(projectToDelete.id);
                        setProjectToDelete(null);
                    }}
                    onCancel={() => setProjectToDelete(null)}
                />
            )}
        </div>
    );
};
