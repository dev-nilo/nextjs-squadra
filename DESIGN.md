# DESIGN.md

The visual contract for Squadra. Every page and modal is built from the tokens, scales and primitives below. If something you need isn't here, add it here first, then use it.

Stack: Tailwind CSS 3, tokens as RGB channels in `app/globals.css`, mapped in `tailwind.config.ts`. Font: **Bricolage Grotesque** (`font-sans`, loaded in `app/layout.tsx`). Icons: **lucide-react**.

---

## Brand

The mark is **Meio-campo**: the pitch's center circle seen from above, split by an S into two equal halves, with the halfway line above and below and the center spot. One drawing says S for Squadra, two Times and a balanced split. Navy (`#1E4360`) and cream (`#F2EEE6`); the whole palette derives from those two colors: cream paper canvas, navy ink and actions.

- **Component**: `Logo` (`components/ui/logo.tsx`), inline geometric SVG on a 100×100 grid: circle r34 with a 5-unit ring, S halves of r17, halfway stubs, center spot. `BrandLockup` is mark + "Squadra" wordmark (`font-black tracking-tight text-brand`); `size`: `sm` (header) · `lg` + `stacked`. The auth panel builds its own larger lockup.
- **Small variant** for 16/32px (`public/icon.svg`, `icon-*-32x32.png`): no stubs and no spot, circle r44 with a 9-unit ring, so the S survives at tab size. Don't use the full mark below ~24px.
- **Where it appears**: home header (lockup left of the search), the auth panel (inverted via `.on-panel`), the exported Times Sorteados PNG, the loader (`LoadingState` flips the mark like a coin toss, `animate-coin-toss`, still under `prefers-reduced-motion`), and the empty Elenco state.
- **Not** used as a decorative motif elsewhere. The Jogador card and the OVR stay as they are.
- **Static assets** (`public/icon.svg`, `icon-*-32x32.png`, `apple-icon.png`, `icon-192/512.png`, `icon-maskable-512.png`, `app/opengraph-image.png`) follow the same geometry. The SVG favicon inverts under `prefers-color-scheme: dark`.
- No paper texture: the canvas is flat cream.

## Theme

- Light and dark follow the OS (`next-themes`, `defaultTheme="system"`, class strategy). There is no toggle.
- Light is cream paper with navy ink; dark is deep navy (`#0C1620`) with cream text.
- Every token has a light value under `:root` and a dark value under `.dark`. Only use tokens, so both themes stay correct for free.
- Any change must be checked in **both** themes.

## Color tokens

| Token | Use |
|-------|-----|
| `background` / `foreground` | Page canvas (cream / deep navy) and default text (navy ink / cream) |
| `panel` / `panel-foreground` | The auth "pitch" panel: navy with cream in light, a lifted navy in dark. Wrap it in `.on-panel` so the mark inverts on it. |
| `brand` / `brand-foreground` | **Logo only**: the mark's navy half and ring, and its cream half. Navy/cream in light, swapped in dark. Never use for UI actions (that's `primary`). |
| `content1` | Surfaces: modals, cards, header, menus |
| `content2`–`content4` | Nested / raised fills |
| `default-50…900`, `default` | Neutrals (warm paper tones in light, navy-grays in dark): input fills (`default-100`), borders (`default-200/300`), muted text (`default-400/500/600`) |
| `divider` | Hairlines and borders between regions |
| `primary` (+ `50…900`) | Navy `#1E4360` in light; light steel blue `#8FB2D1` in dark (navy would vanish on the navy canvas). Main action, selection, focus. `primary-600` is the solid hover. |
| `secondary` | Pitch green. **Reserved for Sorteio actions** (Sortear Times, Sortear, Sortear Novamente). `#81B34D` in dark, deepened to `#467828` in light for AA with cream text. |
| `danger` | Brick red. Destructive actions and errors |
| `warning` / `warning-600` | Ochre. Warnings (`warning-600` for text on `warning/10`) |
| `success` | Cool teal-green, kept distinct from the Sorteio green. Positive confirmation |
| `overlay` | Modal backdrop scrim (near-black navy in both themes), used as `backdrop:bg-overlay/50` |
| `team-1…6` | Vintage kit colors for Times, by index: navy, brick, pitch green, ochre, petrol, wine. Lighter in dark. **Only** for team identity (the crest), never semantic. |

Rules:
- No raw Tailwind palette colors (`gray-*`, `zinc-*`, `white`, `black`, `red-*`…) and no hex/arbitrary colors in `app/`, `components/` or `lib/`. ESLint enforces this.
- Tints use opacity on a token: `bg-primary/10`, `border-danger/20`.
- Team colors (`getTeamPresentation` in `lib/constants.ts`) cycle through `team-1…6`. Never use `danger`/`success` for a Time: a red team reads as an error.
- Attribute values use `getStatColor` (`lib/stat-color.ts`): ≥80 `success`, ≥70 `primary`, ≥50 `warning-600`, else `danger`.

## Typography

Three named levels, defined in `@layer components` in `app/globals.css`. Use the class, not the raw utilities.

| Class | Equals | Use |
|-------|--------|-----|
| `.text-title` | `text-xl sm:text-2xl font-black text-foreground` | Page and modal titles (one per screen) |
| `.text-section` | `text-base sm:text-lg font-bold text-foreground` | Section headings inside a page/modal |
| `.text-muted` | `text-sm text-default-500` | Subtitles, helper text, empty states |
| `.text-display` | `text-2xl sm:text-3xl lg:text-4xl font-normal leading-tight tracking-tight` | **Only** the auth picture caption (one word in `font-black`) |

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
| `Input`, `Select` | `rounded-xl`, `bg-default-100`, `border-default-200`, focus ring `primary`. Always pass `label` or `aria-label`. `Input` sizes `sm` · `md` · `lg` (auth); `endContent` is an interactive trailing slot. |
| `PasswordInput` | `Input` with a show/hide toggle (`aria-pressed`). Use for every password field. |
| `Modal`, `ModalHeader`, `ModalBody`, `ModalFooter` | Native `<dialog>`. Header holds a `.text-title` and optional `.text-muted` subtitle. Footer: secondary action (`flat`) first, primary action last; full width on mobile. |
| `Surface` | Page-level card: `rounded-2xl bg-content1 shadow-2xl p-4 sm:p-6`. Use for any standalone content block outside a modal. |
| `Alert` | Inline status box, `tone`: `danger` · `warning` · `success` · `info`. `rounded-lg`, `bg-<tone>/10`, `text-sm font-medium`. Use instead of hand-rolled colored boxes. |
| `FullScreenLoader` | Centered coin-tossing mark + label on `bg-background`, full viewport. The only loading state for routes and route-level fallbacks. |
| `PlayerAvatar` | Round avatar with image → icon → initials fallback. |
| `Logo`, `BrandLockup` | See **Brand**. |

## Layout

- **App shell**: `app/layout.tsx` renders the single `<Toaster position="top-center" richColors theme="system" />`. Pages never render their own Toaster. Toast colors are remapped to the tokens in `app/globals.css` (sonner's `--normal-*`, `--success-*`, `--error-*`… variables), so they follow the palette.
- **Home**: sticky header with `BrandLockup` left of the search (`bg-content1/95 backdrop-blur-sm border-b border-divider shadow-lg`), content in `max-w-7xl mx-auto px-3 sm:px-6`.
- **Auth screen**: `AuthShell` (`components/auth/auth-shell.tsx`) is the one sign-in layout, used by `/` when there's no Sessão and by every `/auth` route (via `app/auth/layout.tsx`). A `bg-background` card (`sm:rounded-3xl`, `shadow-2xl`) floats over a full-bleed night pitch that shows in the margins. Inside: the content column (`max-w-sm`, centered) and an inset pitch picture (`rounded-2xl`, `.on-panel`) on the right, a band on top on mobile. The picture is drawn, not photographed (`NightPitch`: SVG grass grain, mowing stripes, blurred bands of floodlight and shadow, faint markings) and `KickableBall` on top: drag and release to flick it, tap to kick it away from the touched side, Enter/Space to kick from the keyboard; it rolls with grass friction, spins as it rolls and bounces off the picture edges, and under `prefers-reduced-motion` the friction is high enough that it barely rolls, with pill tags top-right ("Futsal", "Society") and a caption bottom-left: mark + `.text-display` line with one `font-black` word. `AuthPanel` centers mark, title ("Bora pro jogo!") and the inline switch link ("Primeira vez aqui? Criar conta"); fields are `size="lg"` with placeholder + `aria-label`, passwords use `PasswordInput`, the submit is `size="lg" radius="full"`. No links to flows that don't exist (password reset, social login).
- Mobile first: everything must work at 375px with no horizontal scroll.

## Interaction

- Focus: `focus-visible:ring-2 ring-primary` on every interactive element.
- Selection: `ring-2 ring-primary` plus a `primary/10` tint.
- Hover on rows: border shifts toward `primary/40–50`. Only the Jogador card scales (`sm:hover:scale-105`).
- Motion: `transition-colors` / `transition-opacity`; `animate-scale-in` for elements that pop in (selection badge); `animate-coin-toss` only for the loader mark.

## Export (Times Sorteados PNG)

The exported image follows the active theme: its background is read from the `--background` token at export time, never a hardcoded color.

- **Layout is a team sheet (súmula)**: header with the lockup, date, player count and the **difference between the highest and lowest average** (the point of a balanced Sorteio). Each Time is one `bg-content1` surface: crest (`team-N` circle with the letter) + name + count, the average as a big `font-black` number, then a hairline-divided numbered list (`divide-divider`), no card per row. Avatars without a photo show initials.
- Individual ratings are on screen only (`data-export-ignore`); the PNG shows names, positions and team averages. Players are listed **alphabetically**, never in Sorteio order (strongest first), so the numbered list never ranks people.
- `html-to-image` copies the computed style of an `<svg>` root but not of its children, so SVGs inside the export area keep their colors on the root (`color` + inherited `fill`) and children use `currentColor`/inheritance. `Logo` follows this.

## Checklist for a UI change

1. Only tokens, scales and primitives from this file.
2. Checked in light **and** dark, at 375px **and** desktop.
3. `npm run lint`, `npm test`, `npm run build` pass.
