# Per-Project Cloud Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable secure, per-project cloud synchronization between different computers and accounts using Cloudflare R2 object storage via a serverless Cloudflare Worker gateway and client-side AES-256-GCM zero-knowledge encryption.

**Architecture:** Each project has an independent sync channel identified by a `syncId` and protected by a `passkey`. The browser encrypts the project settings, environments, prompts, and all associated missions using WebCrypto AES-GCM before uploading to the Cloudflare Worker. The Worker validates credentials, hashes the `syncId + passkey` to isolate storage paths in Cloudflare R2 (`projects/<sha256>/bundle.enc`), ensuring mathematical isolation across projects and zero exposure of Cloudflare master credentials.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Web Crypto API (PBKDF2 + AES-GCM 256-bit), Zustand stores (`useProjectStore`, `useMissionStore`, `useSettingsStore`), Cloudflare Workers (Edge runtime), Cloudflare R2 (S3-compatible Object Storage).

---

## File Structure & Responsibilities

| File Path | Action | Description |
| :--- | :--- | :--- |
| `src/types/cloudSync.ts` | **Create** | Types for `ProjectSyncBundle`, `ProjectCloudSyncConfig`, `SyncResult`, and client payload interfaces |
| `src/types/index.ts` | **Modify** | Extend `Project` interface with optional `cloud_sync?: ProjectCloudSyncConfig` |
| `src/services/projectSyncCrypto.ts` | **Create** | PBKDF2 key derivation and AES-256-GCM encryption/decryption routines for project sync bundles |
| `src/services/cloudSyncClient.ts` | **Create** | HTTP client to communicate with Cloudflare Worker (`pushProject`, `pullProject`, `checkStatus`) |
| `src/store/useSettingsStore.ts` | **Modify** | Add global `syncWorkerUrl` setting and persistence |
| `src/features/project-editor/components/SettingsSyncSubTab.tsx` | **Create** | Dedicated UI tab in Project Settings to configure sync ID, passkey, push, and pull |
| `src/features/project-editor/components/ProjectSettingsTab.tsx` | **Modify** | Add `sync` sub-tab to the subTabs navigation bar |
| `src/features/ProjectEditor.tsx` | **Modify** | Support `'sync'` in `SettingsTab` type and routing |
| `src/features/project-list/ImportCloudProjectModal.tsx` | **Create** | Modal to connect and import an existing project from the cloud using Sync ID + Passkey |
| `src/features/ProjectList.tsx` | **Modify** | Add "Importar da Nuvem" button in header and sync status badge on project cards |
| `serverless/cloudflare-worker-sync.js` | **Create** | Self-contained Cloudflare Worker script ready to deploy with R2 binding |
| `tests/sync/test-project-sync.cjs` | **Create** | Automated test suite validating encryption, bundle packaging, and sync workflows |
| `package.json` | **Modify** | Add `npm run test:sync` script |

---

## Bite-Sized Implementation Tasks

### Task 1: Data Types and Schema Definition

**Files:**
- Create: `src/types/cloudSync.ts`
- Modify: `src/types/index.ts:39-50`

**Step 1: Write types in `src/types/cloudSync.ts`**

Define the sync bundle structure and configuration:
```typescript
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
}

export interface CloudSyncPullOptions {
    workerUrl: string;
    syncId: string;
    passkey: string;
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
```

**Step 2: Update `Project` interface in `src/types/index.ts`**

Import and add `cloud_sync?: ProjectCloudSyncConfig;` to `Project`.

**Step 3: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with 0 errors.

**Step 4: Commit**

```bash
git add src/types/cloudSync.ts src/types/index.ts
git commit -m "feat(sync): define ProjectCloudSyncConfig and ProjectSyncBundle types"
```

---

### Task 2: Client-Side Zero-Knowledge Crypto & Bundle Serialization

**Files:**
- Create: `src/services/projectSyncCrypto.ts`
- Create: `tests/sync/test-project-sync.cjs`

**Step 1: Write the failing test in `tests/sync/test-project-sync.cjs`**

Test packaging, encryption round-trip, tamper resistance, and invalid passkey rejection:
```javascript
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('esbuild');

async function loadModules() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agenteval-sync-test-'));
    const outfile = path.join(tempDir, 'syncBundle.cjs');

    await build({
        entryPoints: [path.join(__dirname, '../../src/services/projectSyncCrypto.ts')],
        outfile,
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: ['node20'],
        logLevel: 'silent',
    });

    return {
        module: require(outfile),
        cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
    };
}

async function runTests() {
    console.log('Testing Project Sync Crypto...');
    const { module, cleanup } = await loadModules();

    try {
        const dummyProject = {
            id: 'proj-123',
            name: 'Atendimento SAC',
            description: 'Bot de atendimento',
            documentation: 'Docs',
            target_provider: 'http',
            system_prompts: [{ id: 'p1', name: 'Prompt 1', content: 'Ajude o cliente' }],
            environments: [],
        };
        const dummyMissions = [
            {
                id: 'm1',
                project_id: 'proj-123',
                titulo: 'Missao 1',
                target_system_prompt: 'System prompt',
                expected_outcome: 'Outcome',
                max_turns: 5,
                success_criteria: [],
                api_config: { post_url: '', get_url: '', auth_header: '', payload_template: '', response_path: '', polling_interval: 2000, max_timeout: 30 }
            }
        ];

        // 1. Packaging
        const bundle = module.createProjectSyncBundle(dummyProject, dummyMissions, 'sac-bot');
        assert.equal(bundle.version, 1);
        assert.equal(bundle.syncId, 'sac-bot');
        assert.equal(bundle.project.id, 'proj-123');
        assert.equal(bundle.missions.length, 1);

        // 2. Encryption and Decryption Round-Trip
        const passkey = 'minha-senha-secreta-2026';
        const encryptedBytes = await module.encryptProjectBundle(bundle, passkey);
        assert.ok(encryptedBytes instanceof Uint8Array);
        assert.ok(encryptedBytes.length > 50);

        const decryptedBundle = await module.decryptProjectBundle(encryptedBytes, passkey);
        assert.deepEqual(decryptedBundle.project, dummyProject);
        assert.deepEqual(decryptedBundle.missions, dummyMissions);

        // 3. Incorrect Passkey Rejection
        await assert.rejects(
            async () => {
                await module.decryptProjectBundle(encryptedBytes, 'senha-incorreta');
            },
            /descriptografar|decrypt|invalid/i
        );

        console.log('✓ Project Sync Crypto tests passed!');
    } finally {
        cleanup();
    }
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
```

**Step 2: Run test to verify it fails**

Run: `node tests/sync/test-project-sync.cjs`
Expected: FAIL (Cannot find module `src/services/projectSyncCrypto.ts`).

**Step 3: Implement `src/services/projectSyncCrypto.ts`**

Implement standard WebCrypto PBKDF2 (100k rounds, SHA-256) + AES-256-GCM encryption:
```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `node tests/sync/test-project-sync.cjs`
Expected: `✓ Project Sync Crypto tests passed!`

**Step 5: Add script to `package.json` and commit**

Add `"test:sync": "node tests/sync/test-project-sync.cjs"` to `package.json`.
```bash
git add src/services/projectSyncCrypto.ts tests/sync/test-project-sync.cjs package.json
git commit -m "feat(sync): add zero-knowledge AES-256 bundle encryption and tests"
```

---

### Task 3: Cloudflare Worker Gateway Script & Cloud Client Service

**Files:**
- Create: `serverless/cloudflare-worker-sync.js`
- Create: `src/services/cloudSyncClient.ts`
- Modify: `src/store/useSettingsStore.ts:50-100`

**Step 1: Write Cloudflare Worker script `serverless/cloudflare-worker-sync.js`**

Implement isolated project routing by SHA-256 hash of `syncId + ":" + passkey`:
```javascript
/**
 * Cloudflare Worker: AgentEval Per-Project Cloud Sync Gateway
 * Bindings required:
 * - MY_BUCKET: R2 Bucket binding
 * - Optional Environment Variable: ORG_SECRET (if you want to restrict to your team)
 */

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '*';
        const corsHeaders = {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, PUT, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Sync-Id, Authorization, X-Org-Secret',
            'Access-Control-Max-Age': '86400',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Optional Organization-wide secret protection
        if (env.ORG_SECRET) {
            const clientOrgSecret = request.headers.get('X-Org-Secret');
            if (clientOrgSecret !== env.ORG_SECRET) {
                return new Response(
                    JSON.stringify({ error: 'Chave da Organização inválida ou não informada.' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        const syncId = request.headers.get('X-Sync-Id')?.trim()?.toLowerCase();
        const authHeader = request.headers.get('Authorization')?.trim(); // Bearer <passkey>

        if (!syncId || !authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(
                JSON.stringify({ error: 'Sync ID e Senha do Projeto são obrigatórios.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const passkey = authHeader.substring(7).trim();
        if (!passkey) {
            return new Response(
                JSON.stringify({ error: 'Senha do Projeto não informada.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Derive isolated SHA-256 storage key
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest(
            'SHA-256',
            encoder.encode(`${syncId}:${passkey}`)
        );
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const projectHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        const objectKey = `projects/${projectHash}/bundle.enc`;

        // 1. HEAD (Check existence / metadata)
        if (request.method === 'HEAD') {
            const object = await env.MY_BUCKET.head(objectKey);
            if (!object) {
                return new Response(null, { status: 404, headers: corsHeaders });
            }
            return new Response(null, {
                status: 200,
                headers: {
                    ...corsHeaders,
                    'ETag': object.httpEtag,
                    'Last-Modified': object.uploaded.toUTCString(),
                },
            });
        }

        // 2. GET (Pull Project Bundle)
        if (request.method === 'GET') {
            const object = await env.MY_BUCKET.get(objectKey);
            if (!object) {
                return new Response(
                    JSON.stringify({ error: 'Nenhum projeto encontrado para este Sync ID e Senha.' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            return new Response(object.body, {
                status: 200,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/octet-stream',
                    'ETag': object.httpEtag,
                    'Last-Modified': object.uploaded.toUTCString(),
                    'Cache-Control': 'no-store, no-cache',
                },
            });
        }

        // 3. PUT (Push Project Bundle)
        if (request.method === 'PUT') {
            const body = await request.arrayBuffer();
            if (!body || body.byteLength < 32) {
                return new Response(
                    JSON.stringify({ error: 'Payload vazio ou inválido.' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            await env.MY_BUCKET.put(objectKey, body, {
                customMetadata: {
                    syncId,
                    syncedAt: new Date().toISOString(),
                },
            });

            return new Response(
                JSON.stringify({ ok: true, syncedAt: new Date().toISOString() }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    },
};
```

**Step 2: Add `syncWorkerUrl` to `src/store/useSettingsStore.ts`**

Add default URL (fallback to `https://agenteval-sync.alexandre-23b.workers.dev` or empty string) with getter and setter.

**Step 3: Implement `src/services/cloudSyncClient.ts`**

Create client methods:
- `normalizeWorkerUrl(url: string)`: Ensures clean protocol and trims trailing slashes.
- `pushProjectToCloud(options)`: Encrypts bundle via `encryptProjectBundle`, sends `PUT`, returns synced timestamp.
- `pullProjectFromCloud(options)`: Sends `GET`, decrypts buffer via `decryptProjectBundle`, returns `ProjectSyncBundle`.
- `checkCloudProjectStatus(options)`: Sends `HEAD` to check existence and last update time.

**Step 4: Update test suite in `tests/sync/test-project-sync.cjs`**

Add tests validating client URL normalization and request headers. Run: `npm run test:sync`.
Expected: PASS.

**Step 5: Commit**

```bash
git add serverless/cloudflare-worker-sync.js src/services/cloudSyncClient.ts src/store/useSettingsStore.ts tests/sync/test-project-sync.cjs
git commit -m "feat(sync): implement Cloudflare Worker gateway and cloudSyncClient service"
```

---

### Task 4: Project Settings "Cloud Sync" Tab in Project Editor

**Files:**
- Create: `src/features/project-editor/components/SettingsSyncSubTab.tsx`
- Modify: `src/features/project-editor/components/ProjectSettingsTab.tsx:30-65`
- Modify: `src/features/ProjectEditor.tsx:25-30`

**Step 1: Create `src/features/project-editor/components/SettingsSyncSubTab.tsx`**

Build a clean UI with:
- **Status Header:** Indicates if sync is configured, last synced date, and status pill ("Sincronizado", "Não configurado", "Pendente").
- **Inputs:**
  - `Sync ID`: project identifier with "Gerar ID Aleatório" button.
  - `Senha do Projeto (Passkey)`: password input with show/hide toggle.
  - `URL do Worker`: prefilled with global settings URL, customizable per project.
- **Action Buttons:**
  - ⬆️ **"Enviar para Nuvem (Push)"**: executes `pushProjectToCloud`, updates `project.cloud_sync.lastSyncedAt`, adds success toast.
  - ⬇️ **"Puxar da Nuvem (Pull)"**: executes `pullProjectFromCloud`, merges updated prompts/environments into project, updates missions in `useMissionStore`, adds success toast.

**Step 2: Integrate into `ProjectSettingsTab.tsx`**

- Add `{ key: 'sync' as const, label: 'Cloud Sync' }` to `subTabs`.
- Render `<SettingsSyncSubTab />` when `settingsTab === 'sync'`.

**Step 3: Update `ProjectEditor.tsx`**

Update `type SettingsTab = 'info' | 'docs' | 'prompts' | 'environments' | 'sync';`.

**Step 4: Verify build and test**

Run: `npm run build && npm run test:sync`
Expected: Build passes with zero errors.

**Step 5: Commit**

```bash
git add src/features/project-editor/components/SettingsSyncSubTab.tsx src/features/project-editor/components/ProjectSettingsTab.tsx src/features/ProjectEditor.tsx
git commit -m "feat(sync): add Cloud Sync tab to Project Editor with push and pull actions"
```

---

### Task 5: "Importar da Nuvem" Modal on Projects Dashboard

**Files:**
- Create: `src/features/project-list/ImportCloudProjectModal.tsx`
- Modify: `src/features/ProjectList.tsx`

**Step 1: Create `src/features/project-list/ImportCloudProjectModal.tsx`**

Modal with fields:
- `Sync ID`
- `Senha do Projeto (Passkey)`
- `URL do Worker` (defaults to global URL)
- Submit button **"Conectar e Importar Projeto"** with loading state and error alert for wrong passkey.
- On success:
  - If project with same `id` already exists locally: prompts user to overwrite or merge.
  - Saves project in `useProjectStore`.
  - Saves all bundled missions in `useMissionStore`.
  - Navigates directly to the imported project dashboard with success toast.

**Step 2: Modify `src/features/ProjectList.tsx`**

- Add **"Importar da Nuvem"** button with cloud download icon next to "Novo Projeto".
- Add visual cloud badge on project cards if `project.cloud_sync?.syncId` is set, showing `Sincronizado em [data]`.

**Step 3: Verify build and test**

Run: `npm run build && npm run test:sync`
Expected: PASS.

**Step 4: Commit**

```bash
git add src/features/project-list/ImportCloudProjectModal.tsx src/features/ProjectList.tsx
git commit -m "feat(sync): add Import from Cloud modal and sync indicators to ProjectList"
```

---

### Task 6: Global Settings Integration & Documentation

**Files:**
- Modify: `src/features/settings/WorkspaceMigrationSettings.tsx` (or new section in Settings)
- Create: `docs/CLOUDFLARE_R2_SYNC_SETUP.md`

**Step 1: Add default Sync Worker URL in App Settings**

Add input field for `URL Padrão do Worker de Sincronização` in Settings > AI / Workspace, allowing the user to configure `https://agenteval-sync.alexandre-23b.workers.dev` once for the whole app.

**Step 2: Write setup guide in `docs/CLOUDFLARE_R2_SYNC_SETUP.md`**

Provide a 2-minute step-by-step guide with screenshots/instructions:
1. Creating the R2 bucket `agenteval-sync`.
2. Pasting `serverless/cloudflare-worker-sync.js` into Cloudflare Workers dashboard.
3. Adding the `MY_BUCKET` R2 binding.
4. Using it in AgentEval.

**Step 3: Full test verification**

Run:
```bash
npm run test:sync && npm run test:litellm && npm run test:ai-usage && npm run build
```
Expected: All suites pass, zero TypeScript or build warnings.

**Step 4: Commit**

```bash
git add src/features/settings/ docs/CLOUDFLARE_R2_SYNC_SETUP.md
git commit -m "docs(sync): add Cloudflare R2 worker setup guide and global settings configuration"
```

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-09-25-per-project-cloud-sync.md`.
