import React, { useState } from 'react';
import {
    Cloud,
    CloudUpload,
    CloudDownload,
    RefreshCw,
    Key,
    ShieldCheck,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    HelpCircle,
    Sparkles,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Project } from '../../../types';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { useMissionStore } from '../../../store/useMissionStore';
import { useToastStore } from '../../../store/useToastStore';
import {
    pushProjectToCloud,
    pullProjectFromCloud,
    checkCloudProjectStatus,
} from '../../../services/cloudSyncClient';

interface SettingsSyncSubTabProps {
    project: Project;
    onChange: (project: Project) => void;
    onSave: () => void;
}

export const SettingsSyncSubTab: React.FC<SettingsSyncSubTabProps> = ({
    project,
    onChange,
    onSave,
}) => {
    const { syncWorkerUrl } = useSettingsStore();
    const { missions, importMissions } = useMissionStore();
    const addToast = useToastStore((state) => state.addToast);

    const defaultWorkerUrl = syncWorkerUrl || 'https://agenteval-sync.alexandre-23b.workers.dev';

    // Local form state
    const [syncId, setSyncId] = useState(project.cloud_sync?.syncId || '');
    const [passkey, setPasskey] = useState('');
    const [showPasskey, setShowPasskey] = useState(false);
    const [workerUrl, setWorkerUrl] = useState(project.cloud_sync?.workerUrl || defaultWorkerUrl);

    // Operation states
    const [isPushing, setIsPushing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [statusFeedback, setStatusFeedback] = useState<{
        type: 'success' | 'error' | 'info';
        message: string;
    } | null>(null);

    const projectMissions = missions.filter((m) => m.project_id === project.id);
    const lastSyncedAt = project.cloud_sync?.lastSyncedAt;

    const generateRandomSyncId = () => {
        const randomPart = Math.random().toString(36).substring(2, 8);
        const nameSlug = (project.name || 'projeto')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 16);
        const newId = `${nameSlug || 'projeto'}-${randomPart}`;
        setSyncId(newId);
        setStatusFeedback(null);
    };

    const handlePush = async () => {
        if (!syncId.trim()) {
            setStatusFeedback({ type: 'error', message: 'Informe ou gere um Sync ID antes de enviar.' });
            return;
        }
        if (!passkey.trim()) {
            setStatusFeedback({
                type: 'error',
                message: 'Informe a Senha do Projeto para criptografar os dados com segurança.',
            });
            return;
        }

        setIsPushing(true);
        setStatusFeedback(null);

        try {
            const pushResult = await pushProjectToCloud({
                workerUrl: workerUrl.trim() || defaultWorkerUrl,
                syncId: syncId.trim(),
                passkey: passkey.trim(),
                project,
                missions: projectMissions,
            });

            const updatedProject: Project = {
                ...project,
                cloud_sync: {
                    syncId: syncId.trim(),
                    workerUrl: workerUrl.trim() || defaultWorkerUrl,
                    lastSyncedAt: pushResult.syncedAt,
                },
            };

            onChange(updatedProject);
            onSave();

            setStatusFeedback({
                type: 'success',
                message: `Projeto sincronizado com sucesso na nuvem! (${projectMissions.length} missões incluídas).`,
            });
            addToast('Projeto enviado para a nuvem com sucesso!', 'success');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Falha ao enviar projeto para a nuvem.';
            setStatusFeedback({ type: 'error', message: msg });
            addToast(msg, 'error');
        } finally {
            setIsPushing(false);
        }
    };

    const handlePull = async () => {
        if (!syncId.trim()) {
            setStatusFeedback({ type: 'error', message: 'Informe o Sync ID do projeto que deseja baixar.' });
            return;
        }
        if (!passkey.trim()) {
            setStatusFeedback({
                type: 'error',
                message: 'Informe a Senha do Projeto para descriptografar os dados baixados.',
            });
            return;
        }

        setIsPulling(true);
        setStatusFeedback(null);

        try {
            const bundle = await pullProjectFromCloud({
                workerUrl: workerUrl.trim() || defaultWorkerUrl,
                syncId: syncId.trim(),
                passkey: passkey.trim(),
            });

            // Merge cloud project fields into current project
            const updatedProject: Project = {
                ...project,
                name: bundle.project.name || project.name,
                description: bundle.project.description || project.description,
                documentation: bundle.project.documentation || project.documentation,
                target_provider: bundle.project.target_provider || project.target_provider,
                target_gemini_model: bundle.project.target_gemini_model || project.target_gemini_model,
                target_litellm_model: bundle.project.target_litellm_model || project.target_litellm_model,
                system_prompts: bundle.project.system_prompts || project.system_prompts,
                environments: bundle.project.environments || project.environments,
                cloud_sync: {
                    syncId: syncId.trim(),
                    workerUrl: workerUrl.trim() || defaultWorkerUrl,
                    lastSyncedAt: new Date().toISOString(),
                },
            };

            // Merge missions in store
            if (Array.isArray(bundle.missions) && bundle.missions.length > 0) {
                // Ensure mission project_ids match current project id
                const normalizedMissions = bundle.missions.map((m) => ({
                    ...m,
                    project_id: project.id,
                }));
                importMissions(normalizedMissions);
            }

            onChange(updatedProject);
            onSave();

            setStatusFeedback({
                type: 'success',
                message: `Projeto e ${bundle.missions?.length || 0} missões atualizados da nuvem com sucesso!`,
            });
            addToast('Projeto atualizado com a versão da nuvem!', 'success');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Falha ao baixar projeto da nuvem.';
            setStatusFeedback({ type: 'error', message: msg });
            addToast(msg, 'error');
        } finally {
            setIsPulling(false);
        }
    };

    const handleCheckStatus = async () => {
        if (!syncId.trim() || !passkey.trim()) {
            setStatusFeedback({
                type: 'error',
                message: 'Preencha o Sync ID e a Senha do Projeto para verificar a nuvem.',
            });
            return;
        }

        setIsChecking(true);
        setStatusFeedback(null);

        try {
            const status = await checkCloudProjectStatus({
                workerUrl: workerUrl.trim() || defaultWorkerUrl,
                syncId: syncId.trim(),
                passkey: passkey.trim(),
            });

            if (status.exists) {
                const dateStr = status.lastModified ? new Date(status.lastModified).toLocaleString() : 'Recente';
                setStatusFeedback({
                    type: 'info',
                    message: `Projeto encontrado na nuvem! Última modificação: ${dateStr}. Pronto para Puxar (Pull).`,
                });
            } else {
                setStatusFeedback({
                    type: 'info',
                    message: 'Nenhum projeto encontrado na nuvem com este Sync ID e Senha. Você pode enviar a primeira versão com "Enviar para Nuvem (Push)".',
                });
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao verificar status na nuvem.';
            setStatusFeedback({ type: 'error', message: msg });
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Top Status & Security Card */}
            <div className="border border-border/50 bg-[#1C2026] p-6 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#4A72FF]/20 to-[#8B5CF6]/20 border border-[#4A72FF]/30 text-[#4A72FF]">
                            <Cloud className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-title text-white">Sincronização em Nuvem (Cloud Sync)</h2>
                                {lastSyncedAt ? (
                                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                                        <CheckCircle2 className="w-3 h-3" /> Sincronizado
                                    </span>
                                ) : project.cloud_sync?.syncId ? (
                                    <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                                        Configurado
                                    </span>
                                ) : (
                                    <span className="text-[11px] font-semibold text-muted-foreground bg-slate-800/60 border border-border/40 px-2.5 py-0.5 rounded-full">
                                        Não Configurado
                                    </span>
                                )}
                            </div>
                            <p className="text-caption text-muted-foreground mt-0.5">
                                Sincronize este projeto, seus prompts, ambientes e todas as suas missões entre computadores com isolamento total.
                            </p>
                        </div>
                    </div>

                    {lastSyncedAt && (
                        <div className="text-right">
                            <span className="text-caption text-muted-foreground block">Última sincronização</span>
                            <span className="text-label text-slate-200 font-mono">
                                {new Date(lastSyncedAt).toLocaleString()}
                            </span>
                        </div>
                    )}
                </div>

                {/* Zero-Knowledge Security Notice */}
                <div className="mt-4 flex items-start gap-3 bg-[#13161B]/80 border border-border/40 p-3.5 rounded-xl">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-caption text-slate-300 space-y-1">
                        <span className="font-semibold text-white block">Criptografia Ponta a Ponta de Conhecimento Zero (Zero-Knowledge AES-256-GCM)</span>
                        <p className="text-slate-400 leading-relaxed">
                            Todos os dados do projeto são criptografados diretamente no seu navegador usando uma chave derivada da sua Senha (PBKDF2 com 100.000 iterações). O servidor da nuvem armazena apenas bytes indecifráveis e isolados matematicamente. Se você perder a senha, os dados não poderão ser recuperados.
                        </p>
                    </div>
                </div>
            </div>

            {/* Configuration Form Card */}
            <div className="border border-border/50 bg-[#1C2026] p-6 rounded-2xl shadow-sm space-y-5">
                <h3 className="text-title text-white flex items-center gap-2 border-b border-border/40 pb-3">
                    <Key className="w-4 h-4 text-[#4A72FF]" /> Credenciais de Acesso do Projeto
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sync ID */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-label text-slate-300 flex items-center gap-1.5">
                                <span>Sync ID (Canal Único)</span>
                                <span title="Identificador único para este projeto na nuvem. Deve ser compartilhado com quem for acessar este projeto.">
                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-help" />
                                </span>
                            </label>
                            <button
                                type="button"
                                onClick={generateRandomSyncId}
                                className="text-[12px] text-[#4A72FF] hover:text-[#7090FF] flex items-center gap-1 cursor-pointer transition-colors"
                            >
                                <Sparkles className="w-3 h-3" /> Gerar ID Sugerido
                            </button>
                        </div>
                        <Input
                            value={syncId}
                            onChange={(e) => {
                                setSyncId(e.target.value);
                                setStatusFeedback(null);
                            }}
                            placeholder="ex: atendimento-sac-2026"
                            className="font-mono bg-[#13161B] border-border/50 text-white"
                        />
                        <p className="text-caption text-muted-foreground">
                            Use um identificador simples ou o ID sugerido.
                        </p>
                    </div>

                    {/* Passkey */}
                    <div className="space-y-2">
                        <label className="text-label text-slate-300 flex items-center gap-1.5">
                            <span>Senha do Projeto (Passkey)</span>
                            <span title="Chave criptográfica para proteger os dados. Guarde esta senha em um local seguro.">
                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-help" />
                            </span>
                        </label>
                        <div className="relative">
                            <Input
                                type={showPasskey ? 'text' : 'password'}
                                value={passkey}
                                onChange={(e) => {
                                    setPasskey(e.target.value);
                                    setStatusFeedback(null);
                                }}
                                placeholder="Digite a senha para criptografar/descriptografar"
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
                        <p className="text-caption text-muted-foreground">
                            Apenas dispositivos com a mesma senha conseguirão descriptografar o projeto.
                        </p>
                    </div>
                </div>

                {/* Worker URL */}
                <div className="space-y-2 pt-2 border-t border-border/30">
                    <div className="flex items-center justify-between">
                        <label className="text-label text-slate-300 flex items-center gap-1.5">
                            <span>URL do Worker de Sincronização</span>
                            <span title="URL do gateway Cloudflare Worker responsável por rotear para o Cloudflare R2.">
                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-help" />
                            </span>
                        </label>
                        {workerUrl !== defaultWorkerUrl && (
                            <button
                                type="button"
                                onClick={() => setWorkerUrl(defaultWorkerUrl)}
                                className="text-[12px] text-muted-foreground hover:text-slate-200 cursor-pointer"
                            >
                                Restaurar Padrão
                            </button>
                        )}
                    </div>
                    <Input
                        value={workerUrl}
                        onChange={(e) => setWorkerUrl(e.target.value)}
                        placeholder="https://agenteval-sync.alexandre-23b.workers.dev"
                        className="font-mono text-xs bg-[#13161B] border-border/50 text-slate-300"
                    />
                </div>
            </div>

            {/* Status Feedback Alert */}
            {statusFeedback && (
                <div
                    className={`p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${
                        statusFeedback.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : statusFeedback.type === 'error'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                    }`}
                >
                    {statusFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                    ) : statusFeedback.type === 'error' ? (
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                    ) : (
                        <HelpCircle className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
                    )}
                    <span className="text-body font-medium">{statusFeedback.message}</span>
                </div>
            )}

            {/* Sync Action Buttons Card */}
            <div className="border border-border/50 bg-[#1C2026] p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-title text-white">Ações de Sincronização</h3>
                        <p className="text-caption text-muted-foreground mt-0.5">
                            Este projeto possui <strong className="text-white">{projectMissions.length} missões</strong> configuradas localmente.
                        </p>
                    </div>

                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCheckStatus}
                        disabled={isChecking || isPushing || isPulling || !syncId.trim() || !passkey.trim()}
                        className="gap-2 text-xs cursor-pointer border-border/60 hover:bg-[#272D35]"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                        <span>Verificar Status na Nuvem</span>
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Push Button */}
                    <div className="border border-border/40 bg-[#13161B] p-4 rounded-xl flex flex-col justify-between space-y-3">
                        <div>
                            <span className="text-label text-white flex items-center gap-2">
                                <CloudUpload className="w-4 h-4 text-[#4A72FF]" /> Enviar para a Nuvem (Push)
                            </span>
                            <p className="text-caption text-muted-foreground mt-1">
                                Criptografa o projeto e todas as {projectMissions.length} missões locais e envia uma nova versão para a nuvem.
                            </p>
                        </div>
                        <Button
                            onClick={handlePush}
                            disabled={isPushing || isPulling}
                            className="w-full gap-2 bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] hover:scale-[1.01] active:scale-[0.99] text-white shadow-lg shadow-[#4A72FF]/10 cursor-pointer h-10 font-bold text-xs"
                        >
                            {isPushing ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Criptografando & Enviando...</span>
                                </>
                            ) : (
                                <>
                                    <CloudUpload className="w-4 h-4" />
                                    <span>Enviar para Nuvem (Push)</span>
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Pull Button */}
                    <div className="border border-border/40 bg-[#13161B] p-4 rounded-xl flex flex-col justify-between space-y-3">
                        <div>
                            <span className="text-label text-white flex items-center gap-2">
                                <CloudDownload className="w-4 h-4 text-emerald-400" /> Puxar da Nuvem (Pull)
                            </span>
                            <p className="text-caption text-muted-foreground mt-1">
                                Baixa e descriptografa a versão mais recente salva na nuvem, atualizando os prompts, ambientes e missões locais.
                            </p>
                        </div>
                        <Button
                            onClick={handlePull}
                            disabled={isPushing || isPulling}
                            variant="secondary"
                            className="w-full gap-2 border-border/60 hover:bg-[#272D35] hover:scale-[1.01] active:scale-[0.99] text-white cursor-pointer h-10 font-bold text-xs"
                        >
                            {isPulling ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Baixando & Descriptografando...</span>
                                </>
                            ) : (
                                <>
                                    <CloudDownload className="w-4 h-4 text-emerald-400" />
                                    <span>Puxar da Nuvem (Pull)</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
