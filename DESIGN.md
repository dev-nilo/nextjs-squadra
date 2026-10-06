# DESIGN.md

The visual contract for Squadra. Every page and modal is built from the tokens, scales and primitives below. If something you need isn't here, add it here first, then use it.

Stack: Tailwind CSS 3, tokens as RGB channels in `app/globals.css`, mapped in `tailwind.config.ts`. Font: **Bricolage Grotesque** (`font-sans`, loaded in `app/layout.tsx`). Icons: **lucide-react**.

---

## Theme

- Light and dark follow the OS (`next-themes`, `defaultTheme="system"`, class strategy). There is no toggle.
- Every token has a light value under `:root` and a dark value under `.dark`. Only use tokens, so both themes stay correct for free.
- Any change must be checked in **both** themes.

## Color tokens

| Token | Use |
|-------|-----|
| `background` / `foreground` | Page canvas and default text |
| `content1` | Surfaces: modals, cards, header, menus |
| `content2`–`content4` | Nested / raised fills |
| `default-50…900`, `default` | Neutrals: input fills (`default-100`), borders (`default-200/300`), muted text (`default-400/500/600`) |
| `divider` | Hairlines and borders between regions |
| `primary` (+ `50…900`) | Green. Main action, selection, focus, brand accents |
| `secondary` | Purple. **Reserved for Sorteio actions** (Sortear Times, Sortear, Sortear Novamente) |
| `danger` | Destructive actions and errors |
| `warning` / `warning-600` | Warnings (`warning-600` for text on `warning/10`) |
| `success` | Positive confirmation |
| `overlay` | Modal backdrop scrim (black in both themes), used as `backdrop:bg-overlay/50` |

Rules:
- No raw Tailwind palette colors (`gray-*`, `zinc-*`, `white`, `black`, `red-*`…) and no hex/arbitrary colors in `app/`, `components/` or `lib/`. ESLint enforces this.
- Tints use opacity on a token: `bg-primary/10`, `border-danger/20`.
- Team colors (`getTeamPresentation` in `lib/constants.ts`) cycle through the semantic tokens; that's the only place `secondary` appears outside Sorteio actions.
- Attribute values use `getStatColor` (`lib/stat-color.ts`): ≥80 `success`, ≥70 `primary`, ≥50 `warning-600`, else `danger`.

## Typography

Three named levels, defined in `@layer components` in `app/globals.css`. Use the class, not the raw utilities.

| Class | Equals | Use |
|-------|--------|-----|
| `.text-title` | `text-xl sm:text-2xl font-black text-foreground` | Page and modal titles (one per screen) |
| `.text-section` | `text-base sm:text-lg font-bold text-foreground` | Section headings inside a page/modal |
| `.text-muted` | `text-sm text-default-500` | Subtitles, helper text, empty states |

Other sizes come from the Tailwind scale plus one token: `text-2xs` (11px) for tiny uppercase labels. Arbitrary sizes (`text-[10px]`) are banned by ESLint.

`font-black` is the brand's "sporty" weight: titles, ratings, OVR numbers. Body copy stays regular; labels are `font-medium`.

## Radius scale

| Radius | Role |
|--------|------|
| `rounded-2xl` | **Surfaces**: modals, page cards (`Surface`) |
| `rounded-xl` | **Controls and inner blocks**: buttons, inputs, selects, Time cards, info panels |
| `rounded-lg` | **Small items**: alerts, list rows, draggable rows, menu items, image previews |
| `rounded-full` | Avatars, badges, round icon buttons |

The **only exception** is the Jogador card (`PlayerCard`): `rounded-t-card rounded-b-xl`, a FUT-card shape that is part of the product identity. `rounded-t-card` is a named token (2rem) in `tailwind.config.ts`.

## Elevation

- `shadow-2xl` for floating surfaces (modals, page cards, menus, Jogador card).
- `shadow-lg` for the sticky header and floating badges/buttons over a card.
- `shadow-sm` for images inside a card.

## Primitives (`components/ui/`)

| Primitive | Notes |
|-----------|-------|
| `Button` | `color`: `primary` · `secondary` (Sorteio only) · `danger` · `default`. `variant`: `solid` (main action) · `flat` (secondary action, e.g. Cancelar, Voltar) · `light` (tertiary / inline / icon). `size`: `sm` · `md` · `lg`. Supports `isLoading`, `isIconOnly`, `radius="full"`, `startContent`. One `solid` primary or secondary per action group. |
| `Input`, `Select` | `rounded-xl`, `bg-default-100`, `border-default-200`, focus ring `primary`. Always pass `label` or `aria-label`. |
| `Modal`, `ModalHeader`, `ModalBody`, `ModalFooter` | Native `<dialog>`. Header holds a `.text-title` and optional `.text-muted` subtitle. Footer: secondary action (`flat`) first, primary action last; full width on mobile. |
| `Surface` | Page-level card: `rounded-2xl bg-content1 shadow-2xl p-4 sm:p-6`. Use for any standalone content block outside a modal. |
| `Alert` | Inline status box, `tone`: `danger` · `warning` · `success` · `info`. `rounded-lg`, `bg-<tone>/10`, `text-sm font-medium`. Use instead of hand-rolled colored boxes. |
| `FullScreenLoader` | Centered spinner + label on `bg-background`, full viewport. The only loading state for routes and route-level fallbacks. |
| `PlayerAvatar` | Round avatar with image → icon → initials fallback. |

## Layout

- **App shell**: `app/layout.tsx` renders the single `<Toaster position="top-center" richColors theme="system" />`. Pages never render their own Toaster.
- **Home**: sticky header (`bg-content1/95 backdrop-blur-sm border-b border-divider shadow-lg`), content in `max-w-7xl mx-auto px-3 sm:px-6`.
- **Auth routes** (`/auth`, `/auth/confirm`, `/auth/callback`) share `app/auth/layout.tsx`: full-height, centered, `max-w-md` column on `bg-background`. Content goes in a `Surface`.
- Mobile first: everything must work at 375px with no horizontal scroll.

## Interaction

- Focus: `focus-visible:ring-2 ring-primary` on every interactive element.
- Selection: `ring-2 ring-primary` plus a `primary/10` tint.
- Hover on rows: border shifts toward `primary/40–50`. Only the Jogador card scales (`sm:hover:scale-105`).
- Motion: `transition-colors` / `transition-opacity`; `animate-scale-in` for elements that pop in (selection badge).

## Export (Times Sorteados PNG)

The exported image follows the active theme: its background is read from the `--background` token at export time, never a hardcoded color.

## Checklist for a UI change

1. Only tokens, scales and primitives from this file.
2. Checked in light **and** dark, at 375px **and** desktop.
3. `npm run lint`, `npm test`, `npm run build` pass.
