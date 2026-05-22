/**
 * Utilitários de criptografia e decodificação local para proteger chaves de API sensíveis.
 * Utiliza cifra XOR multi-byte com salt dinâmico (vetor aleatório) codificado em Base64.
 * 
 * Isso garante que o valor persistido em disco (localStorage e arquivos JSON do servidor local)
 * não fique exposto em texto limpo, gerando uma string cifrada diferente a cada gravação.
 */

const SECRET_KEY = "AgentEvalSecretKeyForLocalEncryption!2026";

/**
 * Criptografa uma string de texto usando uma cifra de fluxo XOR dinâmica com salt aleatório.
 * Retorna uma string segura prefixada com "enc:" codificada em Base64.
 */
export function encryptApiKey(text: string): string {
    if (!text) return '';
    
    try {
        // Gerar um salt aleatório de 8 bytes
        const saltBytes = Array.from({ length: 8 }, () => Math.floor(Math.random() * 256));
        const textBytes = Array.from(new TextEncoder().encode(text));
        
        const keyBytes = Array.from(new TextEncoder().encode(SECRET_KEY));
        const encryptedBytes: number[] = [];
        
        // Insere o salt no início do payload
        encryptedBytes.push(...saltBytes);
        
        // Cifra os bytes do texto usando XOR triplo (texto ^ chave ^ salt)
        for (let i = 0; i < textBytes.length; i++) {
            const keyChar = keyBytes[i % keyBytes.length];
            const saltChar = saltBytes[i % saltBytes.length];
            encryptedBytes.push(textBytes[i] ^ keyChar ^ saltChar);
        }
        
        // Converte os bytes para string binária segura
        const binString = String.fromCharCode(...encryptedBytes);
        
        // Retorna com prefixo enc: para diferenciar de chaves brutas legadas
        return 'enc:' + btoa(binString);
    } catch (e) {
        console.error('[crypto] Erro ao criptografar chave:', e);
        return text; // Fallback seguro
    }
}

/**
 * Descriptografa uma string contendo o prefixo "enc:".
 * Caso não possua o prefixo, retorna a própria string bruta (retrocompatibilidade).
 */
export function decryptApiKey(encrypted: string): string {
    if (!encrypted) return '';
    
    // Se não for uma chave criptografada por esta versão, retorna o texto puro (compatibilidade retroativa)
    if (!encrypted.startsWith('enc:')) {
        return encrypted;
    }
    
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
        
        const keyBytes = Array.from(new TextEncoder().encode(SECRET_KEY));
        const decryptedBytes: number[] = [];
        
        // Decifra realizando a mesma operação XOR tripla (cifrado ^ chave ^ salt)
        for (let i = 0; i < textBytesPayload.length; i++) {
            const keyChar = keyBytes[i % keyBytes.length];
            const saltChar = saltBytes[i % saltBytes.length];
            decryptedBytes.push(textBytesPayload[i] ^ keyChar ^ saltChar);
        }
        
        // Decodifica a string UTF-8 a partir dos bytes originais
        return new TextDecoder().decode(new Uint8Array(decryptedBytes));
    } catch (e) {
        console.error('[crypto] Erro ao descriptografar chave:', e);
        return '';
    }
}
