---
name: nextjs-shadcn
description: Guide for building UI with Next.js App Router and shadcn/ui components. Use when creating pages, layouts, components, or installing shadcn primitives in the ROBOPRO project.
---

# Next.js + shadcn/ui

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router, `app/` directory) |
| Language | TypeScript strict (`strict: true`) |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (Radix primitives + Tailwind) |
| State | Zustand (simulation core), React context (UI-only state) |
| 3D | `@react-three/fiber` + `@react-three/drei` |
| Editor | `@monaco-editor/react` |

## Project Layout

```
app/
├── layout.tsx          # Root layout: fonts, providers, ThemeProvider
├── page.tsx            # Main simulator page
├── globals.css         # Tailwind directives + CSS variables
└── (simulation)/       # Route group for simulator views
    └── page.tsx

components/
├── ui/                 # shadcn primitives (button, card, tabs, etc.)
├── layout/             # App shell: Sidebar, Header, PanelLayout
├── editor/             # Monaco wrapper
├── scene/              # R3F canvas + 3D components
├── controls/           # Play/Pause/Reset, speed slider
├── wiring/             # Pin wiring panel
└── serial/             # Serial monitor

lib/
├── utils.ts            # cn() helper (clsx + twMerge)
└── hooks/              # Custom React hooks

core/                   # Framework-agnostic simulation (NO React imports)
```

## shadcn/ui Usage Rules

1. **Install via CLI** -- always use `npx shadcn@latest add <component>`, never copy-paste.
2. **Composability** -- combine primitives; don't wrap them in unnecessary abstractions.
3. **Consistent variants** -- use `variant` and `size` props, don't invent new styling APIs.
4. **Dark mode** -- use `next-themes` ThemeProvider; all colors via CSS variables.

### Adding a shadcn component

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add tabs
```

Components land in `components/ui/`. Import from there:

```tsx
import { Button } from "@/components/ui/button"
```

## App Router Conventions

- Pages are `app/**/page.tsx`. Layouts are `app/**/layout.tsx`.
- Default to **Server Components**. Add `"use client"` only when the component uses hooks, event handlers, browser APIs, or refs.
- Heavy client components (Monaco, R3F Canvas) should be in `components/` and lazy-loaded:

```tsx
import dynamic from "next/dynamic"
const Scene = dynamic(() => import("@/components/scene/SimulationScene"), {
  ssr: false,
})
```

## Styling Rules

- Use Tailwind utility classes. No inline `style={}` unless truly dynamic.
- Color tokens via CSS variables: `bg-background`, `text-foreground`, `border-border`.
- Spacing scale: `gap-2`, `p-4`, `m-6` -- stick to the default Tailwind scale.
- Responsive: mobile-first. Use `sm:`, `md:`, `lg:` breakpoints.

## File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Component | PascalCase | `SimulationScene.tsx` |
| Utility | camelCase | `utils.ts` |
| Hook | camelCase, `use` prefix | `useSimulation.ts` |
| Page/Layout | lowercase `page.tsx` / `layout.tsx` | `app/page.tsx` |

## Key Patterns

### Panel-based Layout

The main page uses a resizable panel layout (shadcn `ResizablePanelGroup`):

```
┌─────────────────────────────────────────┐
│  Header (logo + controls)               │
├──────────────┬──────────────────────────┤
│  Code Editor │  3D Scene                │
│  (Monaco)    │  (R3F Canvas)            │
│              ├──────────────────────────┤
│              │  Serial Monitor / Wiring │
├──────────────┴──────────────────────────┤
│  Status Bar                             │
└─────────────────────────────────────────┘
```

### Client Boundary

Keep the client boundary as low as possible in the component tree:

```tsx
// app/page.tsx (Server Component)
import { SimulatorShell } from "@/components/layout/SimulatorShell"

export default function Home() {
  return <SimulatorShell />
}

// components/layout/SimulatorShell.tsx
"use client"
// All interactive UI lives here and below
```
