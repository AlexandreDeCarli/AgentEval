import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CloudDownload,
    ShieldCheck,
    Eye,
    EyeOff,
    RefreshCw,
    AlertCircle,
    HelpCircle,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useProjectStore } from '../../store/useProjectStore';
import { useMissionStore } from '../../store/useMissionStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useToastStore } from '../../store/useToastStore';
import { pullProjectFromCloud } from '../../services/cloudSyncClient';
import { Project } from '../../types';

interface ImportCloudProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ImportCloudProjectModal: React.FC<ImportCloudProjectModalProps> = ({
    isOpen,
    onClose,
}) => {
    const navigate = useNavigate();
    const { projects, addProject, updateProject } = useProjectStore();
    const { importMissions } = useMissionStore();
    const { syncWorkerUrl } = useSettingsStore();
    const addToast = useToastStore((state) => state.addToast);

    const defaultWorkerUrl = syncWorkerUrl || 'https://agenteval-sync.alexandre-23b.workers.dev';

    const [syncId, setSyncId] = useState('');
    const [passkey, setPasskey] = useState('');
    const [showPasskey, setShowPasskey] = useState(false);
    const [workerUrl, setWorkerUrl] = useState(defaultWorkerUrl);
    const [showAdvancedUrl, setShowAdvancedUrl] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleClose = () => {
        setSyncId('');
        setPasskey('');
        setErrorMessage(null);
        setIsLoading(false);
        onClose();
    };

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!syncId.trim()) {
            setErrorMessage('Por favor, informe o Sync ID do projeto.');
            return;
        }
        if (!passkey.trim()) {
            setErrorMessage('Por favor, informe a Senha do Projeto para descriptografar os dados.');
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        try {
            const bundle = await pullProjectFromCloud({
                workerUrl: workerUrl.trim() || defaultWorkerUrl,
                syncId: syncId.trim(),
                passkey: passkey.trim(),
            });

            const importedProject: Project = {
                ...bundle.project,
                cloud_sync: {
                    syncId: syncId.trim(),
                    workerUrl: workerUrl.trim() || defaultWorkerUrl,
                    lastSyncedAt: new Date().toISOString(),
                },
            };

            const existingProject = projects.find((p) => p.id === importedProject.id);
            if (existingProject) {
                updateProject(importedProject.id, importedProject);
            } else {
                addProject(importedProject);
            }

            if (Array.isArray(bundle.missions) && bundle.missions.length > 0) {
                const normalizedMissions = bundle.missions.map((m) => ({
                    ...m,
                    project_id: importedProject.id,
                }));
                importMissions(normalizedMissions);
            }

            addToast(
                `Projeto "${importedProject.name}" e ${bundle.missions?.length || 0} missões importados com sucesso!`,
                'success'
            );

            handleClose();
            navigate(`/projects/${importedProject.id}`);
        } catch (err: unknown) {
            const msg =
                err instanceof Error
                    ? err.message
                    : 'Falha ao conectar e importar o projeto da nuvem.';
            setErrorMessage(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Importar Projeto da Nuvem (Cloud Sync)"
            size="default"
        >
            <form onSubmit={handleImport} className="p-6 space-y-5">
                {/* Security & Description Box */}
                <div className="flex items-start gap-3 bg-[#13161B] border border-border/40 p-3.5 rounded-xl">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-caption text-slate-300">
                        <span className="font-semibold text-white block">Download Seguro Zero-Knowledge</span>
                        <p className="text-slate-400 mt-0.5 leading-relaxed">
                            Insira o Sync ID e a Senha definidos na máquina de origem. O bundle será baixado da nuvem e descriptografado localmente no seu navegador.
                        </p>
                    </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                    <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 flex items-start gap-2.5 animate-fade-in text-caption">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Sync ID */}
                <div className="space-y-1.5">
                    <label className="text-label text-slate-300 flex items-center gap-1.5">
                        <span>Sync ID do Projeto</span>
                        <span title="Identificador único configurado no projeto de origem.">
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-help" />
                        </span>
                    </label>
                    <Input
                        value={syncId}
                        onChange={(e) => {
                            setSyncId(e.target.value);
                            setErrorMessage(null);
                        }}
                        placeholder="ex: atendimento-sac-2026"
                        className="font-mono bg-[#13161B] border-border/50 text-white"
                        autoFocus
                    />
                </div>

                {/* Passkey */}
                <div className="space-y-1.5">
                    <label className="text-label text-slate-300 flex items-center gap-1.5">
                        <span>Senha do Projeto (Passkey)</span>
                        <span title="Senha necessária para decodificar o arquivo cifrado AES-256-GCM.">
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-help" />
                        </span>
                    </label>
                    <div className="relative">
                        <Input
                            type={showPasskey ? 'text' : 'password'}
                            value={passkey}
                            onChange={(e) => {
                                setPasskey(e.target.value);
                                setErrorMessage(null);
                            }}
                            placeholder="Digite a senha do projeto"
                            className="font-mono bg-[#13161B] border-border/50 text-white pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPasskey(!showPasskey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-200 transition-colors cursor-pointer"
                            title={showPasskey ? 'Ocultar senha' : 'Ver senha'}
                        >
                            {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Advanced Gateway URL Toggle */}
                <div className="pt-1">
                    <button
                        type="button"
                        onClick={() => setShowAdvancedUrl(!showAdvancedUrl)}
                        className="text-[12px] text-muted-foreground hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                    >
                        <span>{showAdvancedUrl ? '▼ Ocultar URL do Worker' : '▶ Opções Avançadas (URL do Worker)'}</span>
                    </button>
                    {showAdvancedUrl && (
                        <div className="mt-2 space-y-1 animate-fade-in">
                            <Input
                                value={workerUrl}
                                onChange={(e) => setWorkerUrl(e.target.value)}
                                placeholder="https://agenteval-sync.alexandre-23b.workers.dev"
                                className="font-mono text-xs bg-[#13161B] border-border/50 text-slate-300"
                            />
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/30">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleClose}
                        disabled={isLoading}
                        className="cursor-pointer"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="gap-2 bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] hover:scale-[1.02] active:scale-[0.98] text-white shadow-lg shadow-[#4A72FF]/10 font-bold text-xs cursor-pointer h-10 px-5"
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Conectando & Baixando...</span>
                            </>
                        ) : (
                            <>
                                <CloudDownload className="w-4 h-4" />
                                <span>Conectar e Importar Projeto</span>
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
