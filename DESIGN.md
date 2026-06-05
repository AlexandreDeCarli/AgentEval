---
name: AgentEval
description: Automated end-to-end testing and evaluation platform for conversational AI systems.
colors:
  signal-blue: "#4A72FF"
  signal-blue-hover: "#395CE6"
  command-violet: "#8B5CF6"
  void: "#13161B"
  surface: "#1C2026"
  surface-elevated: "#272D35"
  border-subtle: "#2D3036"
  ink-primary: "#F9FAFB"
  ink-secondary: "#9CA3AF"
  ink-muted: "#64748B"
  success-green: "#10B981"
  alert-red: "#EF4444"
  alert-rose: "#F43F5E"
typography:
  display:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.05em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.signal-blue-hover}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-blue}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-destructive:
    backgroundColor: "{colors.alert-red}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.signal-blue}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  input-default:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.lg}"
    padding: "24px"
  badge-default:
    backgroundColor: "{colors.signal-blue}"
    textColor: "#FFFFFF"
    rounded: "9999px"
    padding: "2px 10px"
  badge-secondary:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink-secondary}"
    rounded: "9999px"
    padding: "2px 10px"
---

# Design System: AgentEval

## 1. Overview

**Creative North Star: "The Mission Control Room"**

A calm, dark operations center where you orchestrate and observe AI test runs with precision. The interface feels like a well-designed control panel: every indicator, every surface, every label exists to communicate status and guide action. Nothing is decorative. Nothing is loud. The density is deliberate: enough information to act on, never so much that you lose the thread.

The system draws its identity from the Vercel school of developer tooling: dark, purposeful, typographically tight. But where generic developer dashboards blur into sameness, AgentEval's palette carries a distinct signal. The blue accent is not neutral infrastructure blue; it's Signal Blue, a vivid, confident mark that says "this is where the action is." The violet accent appears only in high-commitment moments: creating a project, launching a run. The rest of the surface is deliberately quiet so those signals cut through.

This system explicitly rejects: cookie-cutter SaaS dashboards where every screen could belong to any product; playful, gamified dev tools with mascots and confetti; enterprise-heavy UIs drowning in settings panels and visual noise.

**Key Characteristics:**
- Dark, tonal surfaces that create depth without shadows
- Signal-driven color: the primary blue appears sparingly, only where attention is needed
- Tight, uppercase label typography for metadata; relaxed body text for readability
- Cards as data containers, never as decoration
- Micro-interactions that confirm state changes (scale press, border glow), never animate for show

## 2. Colors

A restrained dark palette with one committed accent. The surface band runs from deep void to elevated gray in three controlled steps. Color enters the system only as signal.

### Primary
- **Signal Blue** (#4A72FF): The primary action and focus color. Used for active navigation markers, primary buttons, focus rings, and interactive highlights. Appears on less than 15% of any given screen surface. Its rarity is the point.
- **Signal Blue Hover** (#395CE6): The pressed/hover state of Signal Blue. Darker, more committed.

### Secondary
- **Command Violet** (#8B5CF6): The high-commitment accent. Used exclusively in gradient CTAs (New Project, Generate with AI) where the action creates something new. Never used as a status color or decoration.

### Neutral
- **Void** (#13161B): The deepest background. Body and sidebar footer. The foundation layer.
- **Surface** (#1C2026): Primary card and content background. Where data lives.
- **Surface Elevated** (#272D35): Hover states, input backgrounds, secondary badges. The "lifted" layer.
- **Border Subtle** (#2D3036): Card borders, dividers, section separators. Barely visible at rest.
- **Ink Primary** (#F9FAFB): Headlines, primary text, high-emphasis labels. Near-white.
- **Ink Secondary** (#9CA3AF): Descriptions, metadata, secondary copy. Mid-gray with enough contrast.
- **Ink Muted** (#64748B): Progress indicators, tertiary labels, timestamps. The quietest text.

### Status
- **Success Green** (#10B981): Pass indicators, success badges, run-complete states.
- **Alert Red** (#EF4444): Failure indicators, destructive buttons, error states.
- **Alert Rose** (#F43F5E): Destructive gradient endpoints. Paired with Alert Red for delete confirmations.

### Named Rules
**The Signal Scarcity Rule.** Signal Blue is used on no more than 15% of any screen's surface area. If blue is everywhere, nothing is blue. Reserve it for the element the user should act on next.

**The No Decoration Rule.** Every colored element communicates state, status, or hierarchy. If removing a color would lose no information, remove the color.

## 3. Typography

**Display Font:** system-ui, -apple-system, sans-serif
**Body Font:** system-ui, -apple-system, sans-serif
**Label Font:** system-ui, -apple-system, sans-serif (uppercase, tracked)

**Character:** The type system uses a single system font stack with extreme weight contrast. Display headings are extrabold and tightly tracked; labels are tiny, uppercase, and widely tracked. The contrast between the two creates hierarchy without needing multiple typefaces.

### Hierarchy
- **Display** (800, 1.875rem / 30px, line-height 1.2, letter-spacing -0.025em): Page titles. "Projects", "History", "Settings". Always uppercase, always extrabold.
- **Title** (700, 1.25rem / 20px, line-height 1.3, letter-spacing -0.01em): Section headings, modal titles, card names. Tight tracking.
- **Body** (400, 0.875rem / 14px, line-height 1.6, letter-spacing normal): Descriptions, instructions, mission goals. Relaxed leading for readability. Max 65ch line length where possible.
- **Label** (800, 0.625rem / 10px, line-height 1, letter-spacing 0.05em, uppercase): Metadata chips ("Active Project", "3 Prompts", "2 Envs"), sidebar subtitles, version strings. The workhorse micro-typography.

### Named Rules
**The Weight, Not Face Rule.** Hierarchy is created through weight contrast (400 vs 700 vs 800) and size ratio, never through font-family switching. One family, many weights.

## 4. Elevation

This system uses **tonal layering exclusively**. Depth is conveyed through three background color steps, not box-shadow. The progression Void → Surface → Surface Elevated maps to base → content → interactive/hover.

Shadows appear in exactly two contexts: primary button glow (a colored shadow matching the button's fill, communicating "this is pressable") and modal overlays (a deep, diffuse shadow separating the modal plane from the content plane). These are functional, not atmospheric.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Color steps communicate layer. Shadows appear only for buttons (as colored glow confirming interactivity) and modals (as overlay depth). If a new component "needs a shadow," it probably needs a background color step instead.

## 5. Components

### Buttons
Confident and tactile. Every button has an `active:scale-[0.98]` press effect.

- **Shape:** Gently curved edges (12px radius).
- **Primary:** Signal Blue fill, white text, colored glow shadow (`0 4px 14px rgba(74,114,255,0.3)`). On hover, darkens to Signal Blue Hover.
- **Hover / Focus:** `focus-visible:ring-2 ring-[#4A72FF]`. No visible outline otherwise. Hover darkens fill.
- **Outline:** Surface background, Signal Blue text, subtle border (`border-[#2D3036]`). On hover, fills with Surface Elevated.
- **Destructive:** Red-to-rose gradient fill, white text, red glow shadow. The gradient signals irreversibility.
- **Ghost:** Transparent background, Signal Blue text. On hover, faint white overlay (`bg-white/[0.04]`).
- **Gradient CTA (special):** Signal Blue to Command Violet gradient. Used only for creation actions (New Project, Generate). Includes `hover:scale-[1.02]`.

### Badges / Chips
Small, pill-shaped metadata containers. Always uppercase, tracked, extrabold at 9-10px.

- **Default:** Signal Blue fill, white text. Full pill radius.
- **Secondary:** Surface Elevated fill, Ink Secondary text. No border.
- **Outline:** Transparent fill, subtle border, Ink Muted text. For environment and variable counts.
- **Status:** Success Green or Alert Red tinted background with matching text. For run results.

### Cards / Containers
Data containers, never decorative boxes.

- **Corner Style:** Generously curved (16px radius for project cards, 12px for mission cards).
- **Background:** Surface (#1C2026).
- **Border:** Border Subtle at 50% opacity. On hover, shifts to Signal Blue at 40% opacity.
- **Hover:** Background lightens subtly toward Surface Elevated. A faint top-edge gradient glow appears (Command Violet at 20% opacity).
- **Internal Padding:** 20-24px. Consistent.

### Inputs / Fields
Clean, dark recesses that signal editability.

- **Style:** Surface Elevated fill, Border Subtle stroke, gently curved (12px radius).
- **Focus:** 2px Signal Blue ring, border shifts to Signal Blue. No outline. Smooth 200ms transition.
- **Placeholder:** Ink Secondary color. Same contrast requirement as body text.

### Navigation (Sidebar)
Fixed 256px sidebar. Void background. Content + footer structure.

- **Active state:** Signal Blue text + background tint (15% opacity), 4px left border marker.
- **Inactive state:** Ink Secondary text. On hover, Surface Elevated background, Ink Primary text.
- **Footer:** Separated by faint border. Contains About and Help actions in ghost button style.
- **Version label:** Bottom-anchored, Ink Muted, 10px uppercase tracked text.

### Modals
Premium overlays with considered motion.

- **Backdrop:** Background at 80% opacity + 4px blur. Fades in over 200ms with ease-out-expo.
- **Panel:** Surface background, subtle border, rounded 16px. Scales in from 94% with a spring curve (`cubic-bezier(0.34, 1.56, 0.64, 1)`) over 300ms.
- **Destructive modals:** Red gradient top-edge line. Pulsing red icon. Emphasizes irreversibility.

### Mission Card (Signature Component)
The primary data unit. Horizontal layout on desktop (info left, actions right). Vertical stack on mobile.

- **Structure:** Title + stability badges (top), goal description (middle), metadata chips (bottom).
- **Stability badges:** Tiny pills showing pass/fail + score from last 3 runs. Green for pass, red for fail. Interactive (clickable to view run details).
- **Action cluster:** Edit (outline), Clone (outline), Run (green fill), Delete (ghost destructive). Compact icon buttons.

## 6. Do's and Don'ts

### Do:
- **Do** use Signal Blue only where the user should act or look next. Navigation marker, primary CTA, focus ring.
- **Do** use tonal layering (Void → Surface → Surface Elevated) to create depth. Three steps, consistent everywhere.
- **Do** use uppercase + tracked labels (800 weight, 9-10px) for all metadata chips and status indicators.
- **Do** include `active:scale-[0.98]` on every interactive element. The press feedback is part of the identity.
- **Do** use the destructive gradient (red-to-rose) for irreversible actions. The gradient itself is the warning.
- **Do** respect `prefers-reduced-motion`: swap animations for instant state changes.

### Don't:
- **Don't** use box-shadow for depth on cards or surfaces. Elevation is tonal, not shadow-based. The only shadows are button glows and modal overlays.
- **Don't** use Command Violet outside of gradient CTAs. It's the creation signal; spreading it dilutes the meaning.
- **Don't** make the interface look like a generic SaaS dashboard. If a screen could belong to "any product," it's missing AgentEval's identity. The conversation data, run scores, and mission structure should be unmistakable.
- **Don't** add mascots, illustrations, confetti, or gamification elements. The audience is engineers who trust tools that take their work seriously.
- **Don't** animate images on hover. If a card needs hover feedback, animate the border or background color, never a child image.
- **Don't** use border-left or border-right greater than 1px as a colored accent stripe on cards or alerts. (Exception: the destructive warning callout uses a 2px left border deliberately for severity framing.)
- **Don't** clutter navigation or settings. Every control earns its screen space. Progressive disclosure over settings overload.
