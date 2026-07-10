# DESIGN.md

## Overview
This document captures the visual design system of the **Squadra** Next.js application. It serves as a single source of truth for UI components, color palette, typography, spacing, and interaction patterns. AI agents and developers can reference it to ensure consistency across new screens and components.

---

## Design Tokens

### Colors (OKLCH)
| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `oklch(1 0 0)` (light) / `oklch(0.145 0 0)` (dark) | Page background |
| `--foreground` | `oklch(0.145 0 0)` (light) / `oklch(0.985 0 0)` (dark) | Primary text |
| `--card` | `oklch(1 0 0)` / `oklch(0.145 0 0)` | Card backgrounds |
| `--card-foreground` | `oklch(0.145 0 0)` / `oklch(0.985 0 0)` | Text on cards |
| `--primary` | `oklch(0.205 0 0)` (light) / `oklch(0.985 0 0)` (dark) | Buttons, highlights |
| `--primary-foreground` | `oklch(0.985 0 0)` (light) / `oklch(0.205 0 0)` (dark) | Text on primary elements |
| `--secondary` | `oklch(0.97 0 0)` (light) / `oklch(0.269 0 0)` (dark) | Secondary UI surfaces |
| `--secondary-foreground` | `oklch(0.205 0 0)` (light) / `oklch(0.985 0 0)` (dark) | Text on secondary elements |
| `--muted` | `oklch(0.97 0 0)` (light) / `oklch(0.269 0 0)` (dark) | Disabled/placeholder backgrounds |
| `--muted-foreground` | `oklch(0.556 0 0)` (light) / `oklch(0.708 0 0)` (dark) | Disabled text |
| `--accent` | `oklch(0.97 0 0)` | Accent surface |
| `--accent-foreground` | `oklch(0.205 0 0)` | Text on accent |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Error states |
| `--destructive-foreground` | `oklch(0.985 0 0)` | Text on error |
| `--border` | `oklch(0.922 0 0)` | Border colour |
| `--input` | `oklch(0.922 0 0)` | Input background |
| `--ring` | `oklch(0.708 0 0)` | Focus ring |
| `--chart-1` … `--chart-5` | Various OKLCH values | Chart series colours |
| `--radius` | `0.625rem` | Border‑radius for rounded components |
| `--sidebar` | `oklch(0.985 0 0)` | Sidebar background |
| `--sidebar-foreground` | `oklch(0.145 0 0)` | Sidebar text |
| `--sidebar-primary` | `oklch(0.205 0 0)` | Sidebar accent |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` | Text on sidebar accent |
| `--sidebar-accent` | `oklch(0.97 0 0)` | Secondary sidebar accent |
| `--sidebar-accent-foreground` | `oklch(0.205 0 0)` | Text on secondary accent |
| `--sidebar-border` | `oklch(0.922 0 0)` | Sidebar border |
| `--sidebar-ring` | `oklch(0.708 0 0)` | Sidebar focus ring |

### Typography
| Token | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| `font-heading` | `Inter, system-ui, sans-serif` | 1.5rem (24px) | **700** (bold) | Page titles, modal headings |
| `font-body` | `Inter, system-ui, sans-serif` | 1rem (16px) | **400** (regular) | Body copy |
| `font-label` | `Inter, system-ui, sans-serif` | 0.875rem (14px) | **500** (medium) | Form labels, button text |
| `font-small` | `Inter, system-ui, sans-serif` | 0.75rem (12px) | **400** | Helper text, captions |

### Spacing Scale
| Token | Value |
|-------|-------|
| `spacing-0` | `0rem` |
| `spacing-1` | `0.25rem` (4px) |
| `spacing-2` | `0.5rem` (8px) |
| `spacing-3` | `0.75rem` (12px) |
| `spacing-4` | `1rem` (16px) |
| `spacing-5` | `1.25rem` (20px) |
| `spacing-6` | `1.5rem` (24px) |
| `spacing-8` | `2rem` (32px) |
| `spacing-12` | `3rem` (48px) |
| `spacing-16` | `4rem` (64px) |

---

## Core Components

### Modal (`DrawTeamsModal`)
- **Container**: Glass‑morphism style with `bg-white/10`, `border-white/20`, `backdrop-blur-lg`, `shadow-xl`. Hover scales `1.05`.
- **Header**: Dark overlay (`bg-black/60`) with bold title `Times Sorteados`.
- **Team Card**: Gradient background (`bg-gradient-to-b`) using team‑specific colors, rounded corners, border reflecting team colour. Header includes team name and player count.
- **Player Card**: Rounded avatar, name, position, and drag‑and‑drop interaction. Rating display removed per spec.
- **Interaction**: Drag‑and‑drop with smooth state transitions, hover elevation, and accessible ARIA labels.

### Buttons
- Primary: `bg-primary` with hover `bg-primary/90`, rounded, `transition-colors`.
- Secondary/Close: Text‑only, `text-muted-foreground` with hover `text-foreground`.

### Icons
- Uses **lucide‑react** icons (`Shuffle`, `X`, `User`, `Shield`). Icons inherit current text colour for theming.

---

## Interaction Patterns
- **Glass‑morphism**: Semi‑transparent backgrounds combined with `backdrop-blur` create depth while preserving readability.
- **Hover Scaling**: Subtle `scale‑105` on cards conveys interactivity without jarring motion.
- **Focus Rings**: Utilise the `--ring` token for accessible keyboard focus outlines.
- **Dark Mode**: All colour tokens have light/dark variants defined under `:root` and `.dark` scopes. The application automatically toggles based on the `class="dark"` on the HTML element.

---

## Accessibility & Security Considerations (from mandatory‑secure‑web‑skills)
- **No `dangerouslySetInnerHTML`** – all content is rendered via React JSX, benefiting from native escaping.
- **ARIA Labels** – interactive drag‑and‑drop elements include descriptive `aria-label`s (rating removed for privacy).
- **Focus Management** – modal traps focus and restores it on close.
- **Color Contrast** – chosen OKLCH values provide WCAG AA compliance for both light and dark themes.
- **No Sensitive Data** – UI never exposes user ratings or other sensitive metrics as per request.

---

## How to Keep DESIGN.md Updated
1. **Run the `design‑md` skill** (when available) to auto‑extract new components.
2. **Manual updates** – when adding new screens or component variants, extend the relevant sections (tokens, components, interaction patterns).
3. **Version control** – commit changes alongside component code to keep design and implementation in sync.

---

*Generated by Antigravity using the project’s source files and the mandatory secure web guidelines.*
