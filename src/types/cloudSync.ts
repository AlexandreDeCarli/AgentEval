import { Project, Mission } from './index';

export interface ProjectCloudSyncConfig {
    syncId: string;
    syncKeyEncrypted?: string;
    lastSyncedAt?: string;
    workerUrl?: string;
}

export interface ProjectSyncBundle {
    version: 1;
    projectId: string;
    syncId: string;
    exportedAt: string;
    project: Project;
    missions: Mission[];
}

export interface CloudSyncPushOptions {
    workerUrl: string;
    syncId: string;
    passkey: string;
    project: Project;
    missions: Mission[];
    orgSecret?: string;
}

export interface CloudSyncPullOptions {
    workerUrl: string;
    syncId: string;
    passkey: string;
    orgSecret?: string;
}

export interface CloudSyncStatusResult {
    exists: boolean;
    lastModified?: string;
    etag?: string;
}

export interface CloudSyncPushResult {
    ok: boolean;
    syncedAt: string;
}
