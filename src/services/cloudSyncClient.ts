import {
    CloudSyncPullOptions,
    CloudSyncPushOptions,
    CloudSyncPushResult,
    CloudSyncStatusResult,
    ProjectSyncBundle,
} from '../types/cloudSync';
import {
    createProjectSyncBundle,
    decryptProjectBundle,
    encryptProjectBundle,
} from './projectSyncCrypto';

export function normalizeWorkerUrl(rawUrl: string): string {
    let url = rawUrl.trim();
    if (!url) {
        throw new Error('A URL do Worker não foi informada.');
    }

    if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
    }

    return url.replace(/\/+$/, '');
}

function getHeaders(syncId: string, passkey: string, orgSecret?: string): Record<string, string> {
    const headers: Record<string, string> = {
        'X-Sync-Id': syncId.trim().toLowerCase(),
        'Authorization': `Bearer ${passkey.trim()}`,
    };

    if (orgSecret && orgSecret.trim()) {
        headers['X-Org-Secret'] = orgSecret.trim();
    }

    return headers;
}

export async function pushProjectToCloud(
    options: CloudSyncPushOptions
): Promise<CloudSyncPushResult> {
    const { workerUrl, syncId, passkey, project, missions, orgSecret } = options;

    if (!syncId || !syncId.trim()) {
        throw new Error('Sync ID é obrigatório para enviar o projeto.');
    }
    if (!passkey || !passkey.trim()) {
        throw new Error('A Senha do Projeto é obrigatória para criptografar e enviar.');
    }

    const baseUrl = normalizeWorkerUrl(workerUrl);
    const bundle = createProjectSyncBundle(project, missions, syncId);
    const encryptedBytes = await encryptProjectBundle(bundle, passkey);

    const headers = getHeaders(syncId, passkey, orgSecret);
    headers['Content-Type'] = 'application/octet-stream';

    const response = await fetch(baseUrl, {
        method: 'PUT',
        headers,
        body: encryptedBytes,
    });

    if (!response.ok) {
        let errorMsg = `Erro ${response.status} ao sincronizar na nuvem.`;
        try {
            const errJson = await response.json();
            if (errJson?.error) errorMsg = errJson.error;
        } catch {
            const errText = await response.text();
            if (errText) errorMsg = errText;
        }
        throw new Error(errorMsg);
    }

    const result = await response.json().catch(() => ({}));
    return {
        ok: true,
        syncedAt: result.syncedAt || new Date().toISOString(),
    };
}

export async function pullProjectFromCloud(
    options: CloudSyncPullOptions
): Promise<ProjectSyncBundle> {
    const { workerUrl, syncId, passkey, orgSecret } = options;

    if (!syncId || !syncId.trim()) {
        throw new Error('Sync ID é obrigatório para baixar o projeto.');
    }
    if (!passkey || !passkey.trim()) {
        throw new Error('A Senha do Projeto é obrigatória para descriptografar.');
    }

    const baseUrl = normalizeWorkerUrl(workerUrl);
    const headers = getHeaders(syncId, passkey, orgSecret);

    const response = await fetch(baseUrl, {
        method: 'GET',
        headers,
    });

    if (response.status === 404) {
        throw new Error('Nenhum projeto encontrado para este Sync ID e Senha na nuvem.');
    }

    if (!response.ok) {
        let errorMsg = `Erro ${response.status} ao baixar projeto da nuvem.`;
        try {
            const errJson = await response.json();
            if (errJson?.error) errorMsg = errJson.error;
        } catch {
            const errText = await response.text();
            if (errText) errorMsg = errText;
        }
        throw new Error(errorMsg);
    }

    const encryptedBuffer = await response.arrayBuffer();
    return await decryptProjectBundle(encryptedBuffer, passkey);
}

export async function checkCloudProjectStatus(
    options: CloudSyncPullOptions
): Promise<CloudSyncStatusResult> {
    const { workerUrl, syncId, passkey, orgSecret } = options;

    if (!syncId || !syncId.trim() || !passkey || !passkey.trim()) {
        return { exists: false };
    }

    try {
        const baseUrl = normalizeWorkerUrl(workerUrl);
        const headers = getHeaders(syncId, passkey, orgSecret);

        const response = await fetch(baseUrl, {
            method: 'HEAD',
            headers,
        });

        if (response.status === 404) {
            return { exists: false };
        }

        if (response.ok) {
            return {
                exists: true,
                lastModified: response.headers.get('Last-Modified') || undefined,
                etag: response.headers.get('ETag') || undefined,
            };
        }

        return { exists: false };
    } catch {
        return { exists: false };
    }
}
