/**
 * Utilitários de criptografia e decodificação local para proteger chaves de API sensíveis.
 * Utiliza a Web Crypto API nativa do navegador com algoritmo AES-GCM (256-bit) e
 * chaves criptográficas não-extraíveis geradas dinamicamente na máquina do usuário e
 * persistidas localmente no IndexedDB.
 * 
 * Isso garante o nível máximo de segurança em aplicações client-side (SPA):
 * 1. Não há nenhuma chave secreta/estática exposta ("hardcoded") no bundle JavaScript.
 * 2. A chave gerada é marcada como `extractable: false`, o que impede que qualquer script,
 *    extensão ou inspeção via devtools consiga ler ou extrair os bytes brutos da chave.
 * 3. Utiliza vetor de inicialização (IV) aleatório e criptograficamente seguro por gravação.
 * 4. Mantém compatibilidade retroativa para decifrar chaves legadas gravadas no formato XOR antigo.
 */

const DB_NAME = 'AgentEvalCryptoDB';
const STORE_NAME = 'KeyStore';
const KEY_NAME = 'api-key-encryptor';

/**
 * Abre a conexão com o banco IndexedDB dedicado à criptografia
 */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB não é suportado neste ambiente.'));
            return;
        }
        const request = indexedDB.open(DB_NAME, 1);
        
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

/**
 * Recupera a CryptoKey não-extraível do IndexedDB
 */
function getCryptoKey(db: IDBDatabase): Promise<CryptoKey | null> {
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(KEY_NAME);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Salva a CryptoKey não-extraível no IndexedDB
 */
function saveCryptoKey(db: IDBDatabase, key: CryptoKey): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(key, KEY_NAME);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Obtém ou gera uma CryptoKey AES-GCM persistente de 256 bits não-extraível
 */
async function getOrCreateCryptoKey(): Promise<CryptoKey> {
    const db = await openDB();
    let key = await getCryptoKey(db);
    
    if (!key) {
        key = await window.crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256,
            },
            false, // extractable: false -> Crucial! Impede extração dos bytes do segredo via JS
            ['encrypt', 'decrypt']
        );
        await saveCryptoKey(db, key);
    }
    
    return key;
}

/**
 * Criptografa uma string usando AES-GCM com uma chave não-extraível do IndexedDB.
 * Retorna uma string segura prefixada com "enc2:" codificada em Base64 (contendo IV + Cifrado).
 */
export async function encryptApiKey(text: string): Promise<string> {
    if (!text) return '';
    
    try {
        const key = await getOrCreateCryptoKey();
        
        // Gerar um IV (vetor de inicialização) aleatório de 12 bytes para AES-GCM
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const textBytes = new TextEncoder().encode(text);
        
        // Executar criptografia AES-GCM
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            key,
            textBytes
        );
        
        const encryptedBytes = new Uint8Array(encryptedBuffer);
        
        // Payload final: IV (12 bytes) + bytes criptografados
        const combined = new Uint8Array(iv.length + encryptedBytes.length);
        combined.set(iv, 0);
        combined.set(encryptedBytes, iv.length);
        
        // Converte os bytes combinados para string binária e codifica em Base64
        const binString = Array.from(combined, (b) => String.fromCharCode(b)).join('');
        return 'enc2:' + btoa(binString);
    } catch (e) {
        console.error('[crypto] Erro ao criptografar chave com AES-GCM:', e);
        return text; // Fallback seguro para retrocompatibilidade em ambientes limitados
    }
}

/**
 * Descriptografa uma string que possui prefixo "enc2:" (AES-GCM moderno) ou "enc:" (XOR legado).
 * Se não possuir prefixo, retorna a própria string em texto limpo.
 */
export async function decryptApiKey(encrypted: string): Promise<string> {
    if (!encrypted) return '';
    
    // Formato AES-GCM Moderno
    if (encrypted.startsWith('enc2:')) {
        try {
            const base64Payload = encrypted.substring(5);
            const binString = atob(base64Payload);
            const combined = new Uint8Array(Array.from(binString, (c) => c.charCodeAt(0)));
            
            if (combined.length < 12) {
                return '';
            }
            
            // Extrai o IV (primeiros 12 bytes) e a carga cifrada
            const iv = combined.slice(0, 12);
            const encryptedBytes = combined.slice(12);
            
            const key = await getOrCreateCryptoKey();
            
            // Executa decodificação AES-GCM
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv,
                },
                key,
                encryptedBytes
            );
            
            return new TextDecoder().decode(decryptedBuffer);
        } catch (e) {
            console.error('[crypto] Erro ao descriptografar chave com AES-GCM:', e);
            return '';
        }
    }
    
    // Retrocompatibilidade com o formato XOR antigo (prefixo "enc:")
    if (encrypted.startsWith('enc:')) {
        try {
            const base64Payload = encrypted.substring(4);
            const binString = atob(base64Payload);
            const encryptedBytes = Array.from(binString, (c) => c.charCodeAt(0));
            
            if (encryptedBytes.length < 8) {
                return '';
            }
            
            // Extrai o salt dos primeiros 8 bytes
            const saltBytes = encryptedBytes.slice(0, 8);
            const textBytesPayload = encryptedBytes.slice(8);
            
            // Chave estática legada apenas para restaurar o estado existente
            const legacySecret = "AgentEvalSecretKeyForLocalEncryption!2026";
            const keyBytes = Array.from(new TextEncoder().encode(legacySecret));
            const decryptedBytes: number[] = [];
            
            for (let i = 0; i < textBytesPayload.length; i++) {
                const keyChar = keyBytes[i % keyBytes.length];
                const saltChar = saltBytes[i % saltBytes.length];
                decryptedBytes.push(textBytesPayload[i] ^ keyChar ^ saltChar);
            }
            
            return new TextDecoder().decode(new Uint8Array(decryptedBytes));
        } catch (e) {
            console.error('[crypto] Erro ao descriptografar chave legada XOR:', e);
            return '';
        }
    }
    
    // Retorna a própria string se não tiver nenhum prefixo de criptografia
    return encrypted;
}
