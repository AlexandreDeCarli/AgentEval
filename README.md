# AgentEval

An automated end-to-end testing and evaluation platform for **any system that exposes a conversational HTTP API**.

> **What AgentEval tests:** Not an LLM in isolation — but your **complete system**: backend, API, business logic, and AI layer together. If your system has a chat API (POST to send, GET to poll), AgentEval can test it.

---

## 📸 Screenshots

### Projects Dashboard
Organize your test suite by project. Each project holds documentation, system prompts, environments (dev/staging/prod), and missions.

![Projects Dashboard](docs/demo_projects.png)

### Mission Board — AI Generation
Each project has a mission board. Click **Generate** to let Gemini analyze your project documentation and system prompts and produce a comprehensive test suite automatically.

![Mission Board with AI Generation](docs/demo_project_missions.png)

### Test History
Every run is logged with status, number of turns, and AI evaluation score.

![Test History](docs/demo_history.png)

### Evaluation Report
After each run, the Evaluator Agent produces a full report: overall score, per-criterion breakdown, response metrics, and targeted prompt improvement suggestions.

![Evaluation Report](docs/demo_evaluation.png)

> 📁 More screenshots (chat log, prompt improvements) available in [`docs/`](docs/).

---

## 🚀 How It Works

AgentEval orchestrates a fully automated QA loop between three components:

```
┌─────────────────────────────────────────────────────────┐
│                       AgentEval                         │
│                                                         │
│  ┌──────────────┐                  ┌──────────────────┐ │
│  │ Tester Agent │  ── POST ──────► │  YOUR SYSTEM     │ │
│  │   (Gemini)   │  ◄── GET ─────── │  (Target API)    │ │
│  └──────────────┘                  └──────────────────┘ │
│         │                                               │
│         ▼  (after mission ends)                         │
│  ┌──────────────────┐                                   │
│  │ Evaluator Agent  │ ──► Score + Report + Prompt Fixes │
│  │   (Gemini)       │                                   │
│  └──────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
```

1. **Tester Agent (Gemini)** acts as a simulated user with a specific persona and goal. Sends messages via HTTP `POST`, polls responses via HTTP `GET`.
2. **Your System** is the target — any chatbot, AI assistant, or backend that exposes POST/GET HTTP chat endpoints.
3. **Evaluator Agent (Gemini)** reviews the full conversation log, grades it against your criteria, and produces a detailed report with prompt improvement suggestions.

---

## 🎯 What Can Be Tested?

AgentEval is **system-agnostic**. Any backend that communicates through text over HTTP:

| System Type                    | How it connects                                    |
| ------------------------------ | -------------------------------------------------- |
| WhatsApp Bot (via webhook)     | POST to webhook, GET to chat history API           |
| Customer Support Chatbot       | POST to chat API, GET to poll conversation         |
| Internal AI Assistant          | POST to internal API, GET to fetch responses       |
| Voice Bot (text interface)     | POST transcription text, GET bot reply             |
| Any REST API with chat feature | Configure POST/GET freely per mission              |

---

## ✨ Core Features

### Projects & Environments
Organize test suites by project. Each project holds:
- **Documentation** (Markdown) — used by the AI to generate intelligent missions
- **System Prompts** — the actual prompts from your target system, referenced by missions
- **Environments** — separate configs for dev, staging, and production (URLs + auth only)

### AI Mission Generation
Point AgentEval at your project docs and system prompts. Click **Generate with AI** and Gemini 1.5 Pro analyzes your system and generates 8–15 structured test missions covering happy paths, edge cases, routing, error handling, and multi-turn flows.

### Mission Editor
- **Tester Personas** — define how the simulated user behaves
- **Variables & Randomization** — run the same mission with different inputs (`{{name}}`, `{{order_id}}`, etc.)
- **Evaluation Criteria** — custom grading rules per mission
- **System Prompt Linking** — link to a project system prompt instead of copy-pasting

### Real-time Test Runner
Watch the conversation happen live. Polling indicators, turn-by-turn messages, and debug logs for inspecting raw API responses.

### Automated Evaluation Reports
- Overall score (0–100)
- Per-criterion breakdown (0–10 each)
- Response time metrics (first response + full completion)
- Targeted prompt improvement suggestions with severity levels (`critical` / `important` / `suggestion`)

### Persistent File Storage
All data is stored in JSON files under `./data/` — not browser localStorage. Data survives cache clears, browser updates, and private mode.

---

## 🛠️ Target System Requirements

Your system needs two HTTP endpoints:

### POST — Send Message

AgentEval sends user messages here. Configure a **Payload Template** using `{{message}}` as the placeholder.

```
POST https://your-system.com/api/chat
Authorization: Bearer your-token
Content-Type: application/json

{ "userId": "tester", "text": "{{message}}" }
```

**Expected:** any `2xx` response. Body is ignored.

### GET — Poll Response

AgentEval polls this endpoint until a new response appears.

```
GET https://your-system.com/api/chat/history/tester
Authorization: Bearer your-token
```

**Expected response formats:**

```jsonc
// Root-level array
[{ "id": 1, "role": "model", "content": "Hi! How can I help?" }]

// Or nested
{ "data": { "messages": [{ "id": 1, "role": "model", "content": "..." }] } }
```

AgentEval also understands Gemini-style structured output:
```jsonc
{ "parts": [{ "text": "..." }] }
{ "userResponse": "...", "functionToExecute": "..." }
```

---

## ⚙️ Setup

### 1. Install & run

```bash
npm install
npm run dev
```

### 2. Add Gemini API Key

Go to **Settings** and enter your [Google AI Studio](https://aistudio.google.com/apikey) API key. Stored in `./data/agent-qa-settings.json` on your machine — never sent anywhere except the Gemini API.

### 3. Create a Project

Click **New Project**, add your documentation and system prompts, configure an environment (URLs + auth), then click **Generate with AI** to create your first missions.

---

## 🧰 Tech Stack

| Layer       | Technology                                        |
| ----------- | ------------------------------------------------- |
| Framework   | React 18 + TypeScript                             |
| Bundler     | Vite                                              |
| Styling     | Tailwind CSS v4                                   |
| State       | Zustand + file-based persistence (`./data/*.json`)|
| AI          | Google Gemini API (generation + evaluation)       |
| Icons       | Lucide React                                      |
