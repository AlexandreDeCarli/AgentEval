import React from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { useMissionStore } from '../store/useMissionStore';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, FolderOpen, FileText, Server, Target } from 'lucide-react';

export const ProjectList: React.FC = () => {
    const { projects, deleteProject, addProject } = useProjectStore();
    const { missions } = useMissionStore();
    const navigate = useNavigate();

    const handleNew = () => {
        const id = crypto.randomUUID();
        addProject({
            id,
            name: 'Novo Projeto',
            description: '',
            documentation: '',
            system_prompts: [],
            environments: [],
        });
        navigate(`/projects/${id}`);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                    <p className="text-muted-foreground mt-1">Organize missions by project and environment.</p>
                </div>
                <Button onClick={handleNew} className="gap-2">
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
                                    onClick={() => deleteProject(project.id)}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
        </div>
    );
};
