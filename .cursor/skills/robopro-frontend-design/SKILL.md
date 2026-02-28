---
name: robopro-frontend-design
description: Design system and UX guidelines for the ROBOPRO simulator UI. Use when building pages, designing layouts, choosing colors, or making UX decisions for the simulator frontend.
---

# ROBOPRO Frontend Design System

## Design Philosophy

- **Minimal** -- remove everything that doesn't serve the user's immediate task.
- **Tool-like** -- feel like a professional IDE/CAD tool, not a marketing site.
- **Focused** -- code on the left, visualization on the right, output on the bottom.
- **Dark-first** -- dark theme by default; light theme supported.

## Color Palette

Use shadcn/ui CSS variable tokens. Override in `globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --primary: 221 83% 53%;        /* Blue accent for interactive elements */
  --primary-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;
  --border: 240 5.9% 90%;
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 240 3.7% 15.9%;
  --primary: 217 91% 60%;
  --primary-foreground: 0 0% 100%;
  --destructive: 0 62% 30%;
  --border: 240 3.7% 15.9%;
}
```

## Typography

- **Font**: `Inter` via `next/font/google` -- clean, readable, tool-like.
- **Mono**: `JetBrains Mono` for code editor and serial monitor.
- **Scale**: Keep it tight -- `text-xs` for labels, `text-sm` for body, `text-base` for headings.

## Layout Principles

### 1. Three-Zone Layout

```
┌────────────────────────────────────────────┐
│ ▸ ROBOPRO   [▶ Run] [⏸ Pause] [↻ Reset]  │  ← Header (h-10)
├───────────────┬────────────────────────────┤
│               │                            │
│  Code Editor  │     3D Viewport            │  ← Main (flex-1)
│   (40%)       │      (60%)                 │
│               ├────────────────────────────┤
│               │  Tabs: Serial | Wiring     │  ← Bottom panel
├───────────────┴────────────────────────────┤
│ ● Connected  |  Sim: 1.0x  |  FPS: 60     │  ← Status bar (h-6)
└────────────────────────────────────────────┘
```

### 2. Panel Behavior

- Panels are **resizable** via drag handles (`ResizablePanelGroup`).
- Minimum widths prevent unusable states: editor ≥ 300px, viewport ≥ 400px.
- Bottom panel collapses when not needed.

### 3. Information Density

- Use **compact spacing**: `p-2`, `gap-1`, `text-xs` for toolbars.
- Icons before text for action buttons. Use `lucide-react` icons.
- Tooltips on icon-only buttons.

## Component Guidelines

### Buttons

```tsx
// Primary action (Run)
<Button size="sm" variant="default">
  <Play className="mr-1 h-3 w-3" /> Run
</Button>

// Secondary action (Reset)
<Button size="sm" variant="ghost">
  <RotateCcw className="mr-1 h-3 w-3" /> Reset
</Button>

// Destructive (Stop)
<Button size="sm" variant="destructive">
  <Square className="mr-1 h-3 w-3" /> Stop
</Button>
```

### Cards / Panels

- Use `bg-card` with `border` for panel containers.
- No drop shadows -- keep flat.
- `rounded-none` or `rounded-sm` for tool-like feel.

### Tabs

- Use shadcn `Tabs` for bottom panel (Serial Monitor / Wiring / Components).
- `variant="underline"` style -- minimal chrome.

## Interaction Patterns

| Action | UI Element | Keyboard |
|--------|-----------|----------|
| Run sketch | Header button | `Ctrl+Enter` |
| Pause | Header button | `Ctrl+P` |
| Reset | Header button | `Ctrl+R` |
| Toggle panel | Click tab | -- |
| Zoom 3D | Scroll wheel | -- |
| Orbit 3D | Click + drag | -- |

## Accessibility

- All interactive elements must be keyboard-navigable.
- Use `aria-label` on icon-only buttons.
- Maintain 4.5:1 contrast ratio minimum.
- Use shadcn's built-in Radix accessibility.

## Do NOT

- Add animations unless they communicate state change (loading spinner, panel transition).
- Use gradients, shadows, or decorative elements.
- Create custom color values outside the CSS variable system.
- Make the 3D viewport smaller than the code editor.
