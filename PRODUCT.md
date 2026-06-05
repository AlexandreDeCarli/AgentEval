# Product

## Register

product

## Users

Developers, QA engineers, and technical leads who test conversational AI systems. They range from solo hobbyist developers validating a personal chatbot before shipping, to professional QA teams running structured regression suites against production agents. They work in code-centric environments (IDEs, terminals, dashboards), expect tools that respect their expertise, and have little patience for friction. Typical context: sitting at a desk, focused monitor, dark-mode IDE open in another window, running tests between code changes.

## Product Purpose

AgentEval automates end-to-end testing and evaluation of conversational AI systems exposed via HTTP API or Gemini. It orchestrates a tester agent (simulated user with a persona and goal), a target system (any chatbot or AI backend), and an evaluator agent (scores the conversation and suggests prompt fixes). It exists because manually testing multi-turn AI conversations is slow, inconsistent, and doesn't scale. Success looks like: a developer can set up a project, generate test missions from their documentation with one click, run them against their system, and get actionable evaluation reports with specific prompt improvement suggestions, all in minutes instead of hours.

## Brand Personality

Confident, precise, intelligent. The interface communicates "I trust this tool with my production stack." It speaks with the quiet authority of a senior engineer: no unnecessary flair, no hand-holding, but every detail is considered. The tone is direct and technical without being cold.

## Anti-references

- Generic SaaS dashboards: bland, cookie-cutter layouts where every screen could belong to any product. AgentEval should have a distinct identity rooted in what it actually does (orchestrating AI test conversations).
- Overly playful dev tools: mascots, confetti, gamification. The audience respects tools that take their work seriously.
- Enterprise clutter (Jira-like): dense settings panels, overloaded navigation, visual noise that obscures the core workflow.

## Design Principles

1. **Show the conversation, not the chrome.** The test conversation and evaluation results are the product. Every UI decision should reduce the distance between the user and the data they care about.
2. **Confident defaults, escape hatches when needed.** AI-generated missions, smart polling, sensible environment configs. Power users can override everything, but the happy path requires minimal configuration.
3. **Earned complexity.** Simple on first encounter (onboarding wizard, guided tours), deep when needed (payload templates, variable randomization, per-criterion scoring). Progressive disclosure, not progressive confusion.
4. **Precision over decoration.** Every element communicates something. No ornamental gradients, no decorative borders, no "design" that doesn't serve comprehension or navigation.
5. **Speed as a feature.** The interface should feel as fast as the test runner. Instant navigation, real-time updates, no loading states that could be avoided.

## Accessibility & Inclusion

WCAG AA compliance as the baseline: 4.5:1 contrast for body text, keyboard-navigable interfaces, screen reader support for critical flows. Respect `prefers-reduced-motion` for all animations. No color-only status indicators (always pair with text or icons).
