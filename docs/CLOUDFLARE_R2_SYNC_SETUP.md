# Guia de Configuração: Cloudflare R2 Cloud Sync

Este documento descreve como funciona e como implantar ou utilizar o serviço de sincronização em nuvem por projeto (**Per-Project Cloud Sync**) do **AgentEval**.

---

## 1. Visão Geral e Arquitetura

O **Cloud Sync** do AgentEval permite sincronizar projetos, documentações, system prompts, ambientes e todas as missões vinculadas entre diferentes computadores de forma segura e sem custos de infraestrutura complexa.

```
┌─────────────────────────────────┐
│     AgentEval (Navegador)       │
│                                 │
│ 1. Empacota Projeto & Missões   │
│ 2. Cifra com AES-256-GCM        │
│    (Chave derivada com PBKDF2)  │
└────────────────┬────────────────┘
                 │ PUT / GET (Payload Cifrado + Headers)
                 ▼
┌─────────────────────────────────┐
│   Cloudflare Worker Gateway     │
│   (agenteval-sync.workers.dev)  │
│                                 │
│ - Valida credenciais            │
│ - Roteia por SHA-256            │
│   sha256(syncId:passkey)        │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     Cloudflare R2 Bucket        │
│                                 │
│ projects/<hash>/bundle.enc      │
│ (Armazena apenas bytes cifrados)│
└─────────────────────────────────┘
```

### Princípios de Segurança (Zero-Knowledge):
- **Criptografia no Cliente (AES-256-GCM):** O payload é criptografado localmente no navegador antes de qualquer transmissão via Web Crypto API.
- **Derivação Robusta (PBKDF2):** Utiliza 100.000 iterações com SHA-256 e Salt criptográfico de 16 bytes aleatório por bundle.
- **Isolamento Matemático de Caminhos:** O Worker calcula o hash `SHA-256(syncId + ":" + passkey)` e armazena os dados sob `projects/<sha256>/bundle.enc`. Diferentes projetos ou senhas diferentes nunca colidem nem têm acesso cruzado.
- **Higienização de Credenciais Locais:** Tokens locais de máquina (`syncKeyEncrypted`) são expurgados do bundle antes da exportação.

---

## 2. Gateway Padrão em Produção

O AgentEval já vem pré-configurado por padrão com o gateway ativo:
- **URL do Worker:** `https://agenteval-sync.alexandre-23b.workers.dev/`

Não é necessária nenhuma configuração de servidor adicional para começar a sincronizar.

---

## 3. Como Usar no AgentEval

### Para enviar um projeto existente para a nuvem:
1. Abra o projeto e acesse a aba **Settings** > sub-aba **Cloud Sync**.
2. Defina um **Sync ID** (ou clique em *Gerar ID Sugerido*).
3. Crie uma **Senha do Projeto (Passkey)** forte.
4. Clique em **Enviar para Nuvem (Push)**.
5. Pronto! O projeto e todas as missões foram cifrados e enviados.

### Para importar um projeto existente em outro computador:
1. Na tela principal (**Projects**), clique no botão **Importar da Nuvem**.
2. Preencha o **Sync ID** e a **Senha do Projeto**.
3. Clique em **Conectar e Importar Projeto**.
4. O AgentEval baixará o bundle da nuvem, descriptografará os dados localmente e carregará o projeto e suas missões imediatamente.

---

## 4. Como Implantar seu Próprio Worker (Opcional)

Caso queira hospedar sua própria infraestrutura no Cloudflare Workers e R2:

### Passo 1: Criar o Bucket R2
1. Acesse o painel da [Cloudflare](https://dash.cloudflare.com/).
2. Vá em **R2 Object Storage** > **Create Bucket**.
3. Nome do bucket: `agenteval-sync`.
4. Deixe a localização como automática e clique em **Create Bucket**.

### Passo 2: Criar o Worker
1. No menu lateral, acesse **Workers & Pages** > **Create application** > **Create Worker**.
2. Dê um nome ao Worker (ex: `agenteval-sync`).
3. Clique em **Deploy**.
4. Clique em **Edit code** e cole o conteúdo do arquivo [`serverless/cloudflare-worker-sync.js`](../serverless/cloudflare-worker-sync.js).
5. Clique em **Deploy** novamente.

### Passo 3: Configurar o Binding do R2
1. Nas configurações do Worker recém-criado, vá na aba **Settings** > **Bindings** (ou **Variables and Bindings**).
2. Clique em **Add** > **R2 Bucket binding**:
   - **Variable name:** `MY_BUCKET` (exatamente este nome em maiúsculas).
   - **R2 Bucket:** selecione o bucket criado no Passo 1 (`agenteval-sync`).
3. Clique em **Save and Deploy**.

### Passo 4 (Opcional): Chave de Organização (`ORG_SECRET`)
Se desejar restringir o uso do Worker apenas à sua equipe:
1. Em **Settings** > **Variables and Secrets**, adicione a variável `ORG_SECRET`.
2. O Worker exigirá que o cabeçalho `X-Org-Secret` coincida com esse valor.

### Passo 5: Configurar no AgentEval
1. No AgentEval, vá em **Settings** > **Workspace Migration**.
2. Na seção **Gateway de Sincronização em Nuvem (Cloud Sync)**, insira a URL do seu Worker e clique em **Salvar**.

---

## 5. Testes Automatizados

O sistema inclui testes automatizados de ponta a ponta:
```bash
# Executa testes unitários de criptografia, gateway Worker mock e E2E
npm run test:sync

# Executa teste real ao vivo contra o Cloudflare Worker em produção
node scratch/test-live-worker.cjs
```
