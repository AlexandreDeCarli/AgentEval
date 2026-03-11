# AgentEval

A professional testing and evaluation platform for AI Agents and conversational interfaces. This tool automates the process of "Red Teaming" and performance evaluation by spawning a **Tester Agent** to interact with your **Target Agent**, and then using an **Evaluator Agent** to grade the entire interaction.

## 🚀 How it Works

The system operates in a closed loop involving three main components:

1.  **Tester Agent (Gemini)**: Acts as a user with a specific persona and mission goal. It dynamically interacts with your target system.
2.  **Target Agent (Your System)**: The AI agent or chatbot you want to test. The system connects to it via HTTP APIs.
3.  **Evaluator Agent (Gemini)**: After the mission ends, this agent reviews the full chat log, checks it against your custom criteria, and provides a detailed performance report with scores and prompt improvement suggestions.

## ✨ Core Features

-   **Dynamic Mission Board**: Create and manage "Missions" (test scenarios).
-   **Advanced Mission Editor**:
    -   **Tester Personas**: Define exactly how the test agent should behave.
    -   **Evaluation Criteria**: Set custom rules (e.g., "Tone", "Accuracy", "Safety") for the evaluator to grade.
    -   **Variables & Permutations**: Run the same mission with multiple input combinations (e.g., test different cities, budgets, or user names).
-   **Real-time Test Runner**: Watch the conversation happen live with polling status and terminal-style logs.
-   **Automated Evaluation Reports**: Get an overall score (0-100), criteria breakdown, metrics (response times), and targeted system prompt fixes.
-   **Test History**: Keep a record of every test run for regression testing.

## 🛠️ Prerequisites for Target Systems

To test your AI agent, it must expose two main HTTP endpoints (configured in the Mission Editor):

### 1. Send Message (POST)
The system sends a message to your target agent. You can configure the **Payload Template** using JSON, including the `{{message}}` placeholder.
- **Example Payload**: `{"text": "{{message}}", "userId": "test-user"}`
- **Authentication**: Supports a standard `Authorization` header.

### 2. Poll Responses (GET)
Since AI responses can be slow or streamed via backend processes, the system polls for new messages.
- **Expected Structure**: The endpoint should return an array of messages or an object containing a `messages` or `data` array.
- **Role Identification**: Messages coming from your AI should have the role `model` or `target`.
- **Response Extraction**: The system is smart enough to extract text from simple strings, Gemini-style `parts`, or structured JSON with a `userResponse` field.
- **Turn Completion (Optional)**: If your API provides a `contentStatus: "processing"` flag on the latest user message, the system will wait until it changes to "processed" before continuing.

## ⚙️ Configuration

1.  **API Keys**: Go to **Settings** and provide your Google Gemini API Key.
2.  **Mission Setup**: Define your POST/GET URLs, Auth headers, and response paths in the Mission Editor.

## 🚀 Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Run development server**:
    ```bash
    npm run dev
    ```
3.  **Default Examples**: The system comes pre-loaded with a "Mock" mission. You can run it immediately to see the system in action (it uses a local interceptor to simulate an API).
