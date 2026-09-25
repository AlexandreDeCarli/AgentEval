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
    Copy,
    Check,
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
    const [showAdvancedUrl, setShowAdvancedUrl] = useState(false);

    // Operation states
    const [isPushing, setIsPushing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [statusFeedback, setStatusFeedback] = useState<{
        type: 'success' | 'error' | 'info';
        message: string;
    } | null>(null);

    const projectMissions = missions.filter((m) => m.project_id === project.id);
    const lastSyncedAt = project.cloud_sync?.lastSyncedAt;

    const generateRandomSyncId = () => {
        const randomPart = Math.random().toString(36).substring(2, 8);
        const nameSlug = (project.name || 'project')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 16);
        const newId = `${nameSlug || 'project'}-${randomPart}`;
        setSyncId(newId);
        setStatusFeedback(null);
    };

    const handleCopyShareInstructions = async () => {
        if (!syncId.trim()) {
            setStatusFeedback({
                type: 'error',
                message: 'Please provide or generate a Sync ID before copying sharing instructions.',
            });
            return;
        }

        const appUrl = window.location.origin;
        const passkeySnippet = passkey.trim()
            ? `• Passkey: ${passkey.trim()}`
            : '• Passkey: [Ask the project owner for the passkey]';

        const shareMessage = [
            `AgentEval — Project Cloud Sync`,
            `Project: "${project.name}"`,
            ``,
            `To import and sync this project in AgentEval:`,
            `1. Open AgentEval: ${appUrl}`,
            `2. On the Projects screen, click "Import from Cloud"`,
            `3. Enter the following credentials:`,
            `   • Sync ID: ${syncId.trim()}`,
            `   ${passkeySnippet}`,
            ``,
            `All prompts, environments, and test missions will be securely decrypted on your device.`,
        ].join('\n');

        try {
            await navigator.clipboard.writeText(shareMessage);
            setIsCopied(true);
            addToast('Share instructions copied to clipboard!', 'success');
            setTimeout(() => setIsCopied(false), 2500);
        } catch {
            addToast('Failed to copy to clipboard.', 'error');
        }
    };

    const handlePush = async () => {
        if (!syncId.trim()) {
            setStatusFeedback({ type: 'error', message: 'Please enter or generate a Sync ID before pushing.' });
            return;
        }
        if (!passkey.trim()) {
            setStatusFeedback({
                type: 'error',
                message: 'Please enter the Project Passkey to securely encrypt your project data.',
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
                message: `Project synced to cloud successfully! (${projectMissions.length} missions encrypted & included).`,
            });
            addToast('Project pushed to cloud successfully!', 'success');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to push project to cloud.';
            setStatusFeedback({ type: 'error', message: msg });
            addToast(msg, 'error');
        } finally {
            setIsPushing(false);
        }
    };

    const handlePull = async () => {
        if (!syncId.trim()) {
            setStatusFeedback({ type: 'error', message: 'Please enter the Project Sync ID to pull.' });
            return;
        }
        if (!passkey.trim()) {
            setStatusFeedback({
                type: 'error',
                message: 'Please enter the Project Passkey to decrypt downloaded project data.',
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

            if (Array.isArray(bundle.missions) && bundle.missions.length > 0) {
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
                message: `Project and ${bundle.missions?.length || 0} missions updated from cloud successfully!`,
            });
            addToast('Project updated from cloud version!', 'success');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to pull project from cloud.';
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
                message: 'Enter both Sync ID and Passkey to verify cloud status.',
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
                const dateStr = status.lastModified ? new Date(status.lastModified).toLocaleString() : 'Recent';
                setStatusFeedback({
                    type: 'info',
                    message: `Project found in cloud! Last modified: ${dateStr}. Ready to pull.`,
                });
            } else {
                setStatusFeedback({
                    type: 'info',
                    message: 'No project found in cloud with this Sync ID and Passkey. You can send the first version using "Push to Cloud".',
                });
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error checking cloud status.';
            setStatusFeedback({ type: 'error', message: msg });
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch animate-fade-in">
            {/* Left Card: Credentials & Sharing */}
            <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <h2 className="text-title text-white flex items-center gap-2">
                            <Key className="w-4 h-4 text-[#4A72FF]" /> Sync Credentials
                        </h2>
                        {lastSyncedAt ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Synced
                            </span>
                        ) : project.cloud_sync?.syncId ? (
                            <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                Configured
                            </span>
                        ) : (
                            <span className="text-[11px] font-semibold text-muted-foreground bg-slate-800/60 border border-border/40 px-2 py-0.5 rounded-full">
                                Not Configured
                            </span>
                        )}
                    </div>

                    {/* Sync ID */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-label text-slate-300 flex items-center gap-1.5">
                                <span>Project Sync ID</span>
                                <span title="Unique identifier for this project channel in the cloud. Shared with collaborators.">
                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                </span>
                            </label>
                            <button
                                type="button"
                                onClick={generateRandomSyncId}
                                className="text-xs text-[#4A72FF] hover:text-[#7090FF] flex items-center gap-1 cursor-pointer transition-colors"
                            >
                                <Sparkles className="w-3 h-3" /> Suggest ID
                            </button>
                        </div>
                        <Input
                            value={syncId}
                            onChange={(e) => {
                                setSyncId(e.target.value);
                                setStatusFeedback(null);
                            }}
                            placeholder="e.g. customer-support-agent"
                            className="font-mono bg-background text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Unique channel name used to identify this project bundle in the cloud.
                        </p>
                    </div>

                    {/* Passkey */}
                    <div className="space-y-1.5">
                        <label className="text-label text-slate-300 flex items-center gap-1.5">
                            <span>Project Passkey</span>
                            <span title="Secret password used to derive the AES-256-GCM encryption key. Never sent in plain text.">
                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
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
                                placeholder="Enter project secret passkey"
                                className="font-mono bg-background text-sm pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasskey(!showPasskey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-200 transition-colors cursor-pointer"
                                title={showPasskey ? 'Hide passkey' : 'Show passkey'}
                            >
                                {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Required to encrypt/decrypt project data. Keep this password safe.
                        </p>
                    </div>

                    {/* Copy Share Instructions Button */}
                    <div className="pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleCopyShareInstructions}
                            disabled={!syncId.trim()}
                            className="w-full gap-2 text-xs h-9 hover:border-[#4A72FF]/40 text-slate-200 hover:text-white"
                        >
                            {isCopied ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-300">Instructions Copied to Clipboard!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5 text-[#4A72FF]" />
                                    <span>Copy Sharing Instructions</span>
                                </>
                            )}
                        </Button>
                        <p className="text-[11px] text-muted-foreground mt-1 text-center">
                            Copies an easy guide with app link and IDs for your team to import this project.
                        </p>
                    </div>

                    {/* Advanced Worker Gateway URL Toggle */}
                    <div className="pt-2 border-t border-border/40">
                        <button
                            type="button"
                            onClick={() => setShowAdvancedUrl(!showAdvancedUrl)}
                            className="text-xs text-muted-foreground hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                        >
                            <span>{showAdvancedUrl ? '▼ Hide Worker Gateway URL' : '▶ Advanced: Custom Gateway URL'}</span>
                        </button>
                        {showAdvancedUrl && (
                            <div className="mt-2 space-y-1.5 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <label className="text-label text-slate-300">
                                        Worker Gateway URL
                                    </label>
                                    {workerUrl !== defaultWorkerUrl && (
                                        <button
                                            type="button"
                                            onClick={() => setWorkerUrl(defaultWorkerUrl)}
                                            className="text-xs text-primary hover:underline cursor-pointer"
                                        >
                                            Reset to Default
                                        </button>
                                    )}
                                </div>
                                <Input
                                    value={workerUrl}
                                    onChange={(e) => setWorkerUrl(e.target.value)}
                                    placeholder="https://agenteval-sync.alexandre-23b.workers.dev"
                                    className="font-mono text-xs bg-background"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Right Card: Cloud Actions & Status */}
            <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <div>
                            <h2 className="text-title text-white flex items-center gap-2">
                                <Cloud className="w-4 h-4 text-[#4A72FF]" /> Cloud Synchronization
                            </h2>
                            {lastSyncedAt && (
                                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                    Last synced: {new Date(lastSyncedAt).toLocaleString()}
                                </p>
                            )}
                        </div>

                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleCheckStatus}
                            disabled={isChecking || isPushing || isPulling || !syncId.trim() || !passkey.trim()}
                            className="gap-1.5 text-xs h-8 px-2.5"
                            title="Check if this project channel currently exists in the cloud"
                        >
                            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                            <span>Check Cloud</span>
                        </Button>
                    </div>

                    {/* Status Feedback Alert */}
                    {statusFeedback && (
                        <div
                            className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs animate-fade-in ${
                                statusFeedback.type === 'success'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                    : statusFeedback.type === 'error'
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                    : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                            }`}
                        >
                            {statusFeedback.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                            ) : statusFeedback.type === 'error' ? (
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                            ) : (
                                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                            )}
                            <span className="font-medium">{statusFeedback.message}</span>
                        </div>
                    )}

                    {/* Push Action */}
                    <div className="space-y-1.5 pt-1">
                        <Button
                            onClick={handlePush}
                            disabled={isPushing || isPulling}
                            className="w-full bg-gradient-to-r from-[#4A72FF] to-[#8B5CF6] hover:brightness-110 text-white shadow-md shadow-[#4A72FF]/20 text-xs h-10 gap-2"
                        >
                            {isPushing ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Encrypting & Pushing...</span>
                                </>
                            ) : (
                                <>
                                    <CloudUpload className="w-4 h-4" />
                                    <span>Push to Cloud (Send Revisions)</span>
                                </>
                            )}
                        </Button>
                        <p className="text-[11px] text-muted-foreground">
                            Encrypts project settings and all <strong>{projectMissions.length} local missions</strong> to the cloud.
                        </p>
                    </div>

                    {/* Pull Action */}
                    <div className="space-y-1.5 pt-1">
                        <Button
                            onClick={handlePull}
                            disabled={isPushing || isPulling}
                            variant="secondary"
                            className="w-full hover:border-emerald-500/40 text-slate-200 hover:text-white text-xs h-10 gap-2"
                        >
                            {isPulling ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Downloading & Decrypting...</span>
                                </>
                            ) : (
                                <>
                                    <CloudDownload className="w-4 h-4 text-emerald-400" />
                                    <span>Pull from Cloud (Update Local)</span>
                                </>
                            )}
                        </Button>
                        <p className="text-[11px] text-muted-foreground">
                            Downloads and decrypts the latest version from cloud, updating local configuration and missions.
                        </p>
                    </div>

                    {/* Zero-Knowledge Security Notice (Compact) */}
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Zero-Knowledge AES-256-GCM Security</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Project data is encrypted locally using PBKDF2 (100,000 rounds) before upload. The cloud server stores only indecipherable bytes.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};
