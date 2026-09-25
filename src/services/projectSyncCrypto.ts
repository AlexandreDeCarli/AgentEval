import { Project, Mission } from '../types';
import { ProjectSyncBundle } from '../types/cloudSync';

const SALT_BYTES = 16;
const IV_BYTES = 12;
const PBKDF2_ITERATIONS = 100_000;

export const createProjectSyncBundle = (
    project: Project,
    missions: Mission[],
    syncId: string
): ProjectSyncBundle => {
    return {
        version: 1,
        projectId: project.id,
        syncId: syncId.trim(),
        exportedAt: new Date().toISOString(),
        project: {
            ...project,
            // Strip machine-local encrypted sync credentials before sending
            cloud_sync: project.cloud_sync
                ? {
                      syncId: project.cloud_sync.syncId,
                      lastSyncedAt: new Date().toISOString(),
                      workerUrl: project.cloud_sync.workerUrl,
                  }
                : undefined,
        },
        missions: missions.filter((m) => m.project_id === project.id),
    };
};

const getCrypto = (): Crypto => {
    if (typeof window !== 'undefined' && window.crypto) return window.crypto;
    // Node.js support
    return (globalThis as unknown as { crypto: Crypto }).crypto;
};

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const cryptoObj = getCrypto();
    const enc = new TextEncoder();
    const keyMaterial = await cryptoObj.subtle.importKey(
        'raw',
        enc.encode(passphrase),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return cryptoObj.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt as BufferSource,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encryptProjectBundle(
    bundle: ProjectSyncBundle,
    passphrase: string
): Promise<Uint8Array> {
    const cryptoObj = getCrypto();
    const enc = new TextEncoder();
    const jsonString = JSON.stringify(bundle);
    const dataBytes = enc.encode(jsonString);

    const salt = new Uint8Array(SALT_BYTES);
    const iv = new Uint8Array(IV_BYTES);
    cryptoObj.getRandomValues(salt);
    cryptoObj.getRandomValues(iv);

    const key = await deriveKey(passphrase, salt);

    const ciphertext = await cryptoObj.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv as BufferSource,
        },
        key,
        dataBytes as BufferSource
    );

    const cipherBytes = new Uint8Array(ciphertext);
    const combined = new Uint8Array(SALT_BYTES + IV_BYTES + cipherBytes.length);
    combined.set(salt, 0);
    combined.set(iv, SALT_BYTES);
    combined.set(cipherBytes, SALT_BYTES + IV_BYTES);

    return combined;
}

export async function decryptProjectBundle(
    encryptedData: Uint8Array | ArrayBuffer,
    passphrase: string
): Promise<ProjectSyncBundle> {
    const cryptoObj = getCrypto();
    const bytes = encryptedData instanceof Uint8Array ? encryptedData : new Uint8Array(encryptedData);

    if (bytes.length < SALT_BYTES + IV_BYTES + 16) {
        throw new Error('Invalid encrypted bundle payload: data is too short or corrupted.');
    }

    const salt = bytes.slice(0, SALT_BYTES);
    const iv = bytes.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
    const ciphertext = bytes.slice(SALT_BYTES + IV_BYTES);

    let decrypted: ArrayBuffer;
    try {
        const key = await deriveKey(passphrase, salt);
        decrypted = await cryptoObj.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv as BufferSource,
            },
            key,
            ciphertext as BufferSource
        );
    } catch {
        throw new Error('Falha ao descriptografar projeto. A Senha do Projeto está incorreta.');
    }

    const dec = new TextDecoder();
    const jsonText = dec.decode(decrypted);
    const parsed = JSON.parse(jsonText) as ProjectSyncBundle;

    if (!parsed || parsed.version !== 1 || !parsed.project || !Array.isArray(parsed.missions)) {
        throw new Error('O arquivo de sincronização descriptografado não possui um formato válido de projeto.');
    }

    return parsed;
}
