# DESIGN.md

The visual contract for Squadra. Every page and modal is built from the tokens, scales and primitives below. If something you need isn't here, add it here first, then use it.

Stack: Tailwind CSS 3, tokens as RGB channels in `app/globals.css`, mapped in `tailwind.config.ts`. Font: **Bricolage Grotesque** (`font-sans`, loaded in `app/layout.tsx`). Icons: **lucide-react**.

---

## Brand

The mark is **Meio-campo**: the pitch's center circle seen from above, split by an S into two equal halves, with the halfway line above and below and the center spot. One drawing says S for Squadra, two Times and a balanced split. Navy (`#14213D`) and cream (`#F4EDE0`), with the center spot in Colete orange (`#FF5B14`). The mark keeps those exact colors; the app palette around it is "a quadra à noite" (see **Color tokens**).

- **Component**: `Logo` (`components/ui/logo.tsx`), inline geometric SVG on a 100×100 grid: circle r34 with a 5-unit ring, S halves of r17, halfway stubs, center spot. The spot is the one literal color in a component (`fill="#FF5B14"`): an SVG attribute survives the PNG export, a class wouldn't (see the export notes below). `BrandLockup` is mark + "Squadra" wordmark (`font-black tracking-tight text-brand`); `size`: `sm` (header) · `lg` + `stacked`. The auth panel builds its own larger lockup.
- **Small variant** for 16/32px (`public/icon.svg`, `icon-*-32x32.png`): no stubs and no spot, circle r44 with a 9-unit ring, so the S survives at tab size. Don't use the full mark below ~24px.
- **Where it appears**: home header (lockup left of the search), the auth panel (inverted via `.on-panel`), the exported Times Sorteados PNG, the loader (`LoadingState` flips the mark like a coin toss, `animate-coin-toss`, still under `prefers-reduced-motion`), and the empty Elenco state.
- **Not** used as a decorative motif elsewhere. The Jogador card and the OVR stay as they are.
- **Static assets** (`public/icon.svg`, `icon-*-32x32.png`, `apple-icon.png`, `icon-192/512.png`, `icon-maskable-512.png`, `app/opengraph-image.png`) follow the same geometry. The SVG favicon inverts under `prefers-color-scheme: dark`.
- No paper texture: the canvas is flat.

## Theme

- Light and dark follow the OS (`next-themes`, `defaultTheme="system"`, class strategy). There is no toggle.
- The idea is **a quadra à noite**: light is Giz (chalk-white court lines, `#F2F4F7`) with navy ink; dark is the brand navy itself (`#14213D`) with Giz text, never a tinted near-black.
- The Jogador card is the **one warm, printed object** in the app (Papel, `#FBF6EA`, same in both themes). Everything around it stays quiet.
- Every token has a light value under `:root` and a dark value under `.dark`. Only use tokens, so both themes stay correct for free.
- Any change must be checked in **both** themes.

## Color tokens

| Token | Use |
|-------|-----|
| `background` / `foreground` | Page canvas (Giz `#F2F4F7` / navy `#14213D`) and default text (navy ink / Giz) |
| `panel` / `panel-foreground` | The auth "pitch" panel: navy with cream in light, a deeper navy than the canvas in dark (so the auth card still floats). Wrap it in `.on-panel` so the mark inverts on it. |
| `paper` / `paper-foreground` | Papel `#FBF6EA` with navy ink. **Only** the Jogador card (figurinha card stock). Same in both themes. |
| `brand` / `brand-foreground` | **Logo only**: the mark's navy half and ring, and its cream half. Navy/cream in light, swapped in dark. Never use for UI actions (that's `primary`). |
| `content1` | Surfaces: modals, header, menus (white in light, a lifted navy in dark) |
| `content2`–`content4` | Nested / raised fills |
| `default-50…900`, `default` | Neutrals (cool, navy-biased grays):  input fills (`default-100`), borders (`default-200/300`), muted text (`default-400/500/600`) |
| `divider` | Hairlines and borders between regions |
| `primary` (+ `50…900`) | Navy `#14213D` in light; periwinkle `#96ACE0` in dark (navy would vanish on the navy canvas). Main action, selection, focus. `primary-600` is the solid hover. |
| `accent` / `accent-foreground` | Colete `#FF5B14` (`#FF7A40` in dark), the fluorescent bib that splits teams in a pelada. **"You / live / active" only**: the active tab's underline, the "Você" badge, the "Ao vivo" dot, the "Qual desses é você?" banner (`bg-accent/10`) and the logo's center spot. A fill under navy text (`accent-foreground`, 5.1:1) or a non-text mark. **Never as text on Giz** (2.8:1); Colete text only on navy. Never for actions (`primary`) or errors (`danger`). |
| `secondary` | Gramado `#43AA54` (artificial turf; `#5FC46E` in dark) with navy text (5.4:1). **Reserved for Sorteio actions** ("Sortear times", "Sortear", "Sortear de novo"). |
| `danger` | Brick red. Destructive actions and errors |
| `warning` / `warning-600` | Ochre. Warnings (`warning-600` for text on `warning/10`) |
| `success` | Deep teal-green, kept distinct from the bright Gramado. Positive confirmation |
| `overlay` | Modal backdrop scrim (near-black navy in both themes), used as `backdrop:bg-overlay/50` |
| `team-1…6` | Vintage kit colors for Times, by index: navy, brick, pitch green, ochre, petrol, wine. Lighter in dark. **Only** for team identity (the crest), never semantic. |

Rules:
- No raw Tailwind palette colors (`gray-*`, `zinc-*`, `white`, `black`, `red-*`…) and no hex/arbitrary colors in `app/`, `components/` or `lib/`. ESLint enforces this.
- Tints use opacity on a token: `bg-primary/10`, `border-danger/20`.
- Team colors (`getTeamPresentation` in `lib/constants.ts`) cycle through `team-1…6`. Never use `danger`/`success` for a Time: a red team reads as an error.
- Attribute values use `getStatColor` (`lib/stat-color.ts`): ≥80 `success`, ≥70 `primary`, ≥50 `warning-600`, else `danger`.

## Typography

One family, **Bricolage Grotesque**, loaded with its variable `wdth` and `opsz` axes. Its personality comes from using the axes, not from bolding everything.

Scale (Bringhurst): **12 · 14 · 16 · 18 · 24 · 36 · 48** (`text-xs`, `sm`, `base`, `lg`, `2xl`, `4xl`, `5xl`). Don't use `text-xl` (20) or `text-3xl` (30). Arbitrary sizes (`text-[10px]`) are banned by ESLint.

Named classes, defined in `@layer components` in `app/globals.css`. Use the class, not the raw utilities.

| Class | Equals | Use |
|-------|--------|-----|
| `.text-title` | `text-2xl font-bold tracking-tight text-foreground` | Page and modal titles (one per screen) |
| `.text-section` | `text-lg font-semibold text-foreground` | Section headings inside a page/modal |
| `.text-label` | `text-sm font-medium text-default-500` | A heading over a list or group ("Próximas", "Times", "Não vão"), in sentence case |
| `.text-muted` | `text-sm text-default-500` | Subtitles, helper text, empty states |
| `.text-numeral` | Bricolage at `wdth 75`, `opsz 96`, weight 800, tabular, tight | **Printed numerals**: OVR, "8 de 14", Time averages, the Sorteio spread. Combine with a size from the scale. |
| `.text-display` | `text-2xl sm:text-4xl font-normal leading-tight tracking-tight` | **Only** the auth picture caption, in a single weight |

Weights: body 400, labels and names in lists 500, section headings 600, titles 700, numerals 800. `font-black` is left only for the "Squadra" wordmark (and the Jogador card until its redesign).

## Copy

- **Sentence case** everywhere a person reads: buttons, titles, labels ("Sortear times", "Nome do jogador", "Nova partida"). Acronyms stay as they are (VEL, ATA, CSV, OVR).
- **Domain terms are lowercase in UI copy** ("Essa partida já começou", "Seu jogador entrou no elenco"). They're capitalized in code, docs and CONTEXT.md only. A tab or page name at the start of a line is just sentence case ("Elenco", "Partidas").
- **No all-caps labels** and no tracked-out eyebrows above headings: use `.text-label`.
- **No middle-dot meta strings** ("A · B · C"). Write it as a phrase: "ATA, OVR 75", "18%, 3 de 10", "Link de convite, vale até 19/11". Browser `<title>`s ("Elenco · Squadra") are the one exception.
- **Numbering only where order is real**: the presence list (confirmation order and slots), never an alphabetical list.
- Voice is the group's: plain verbs, short, no exclamation marks in system feedback ("Você entrou.", not "Login realizado com sucesso!").

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
- **The fut's frame** (`app/g/[slug]/layout.tsx` → `FutShell`): every page inside a fut shares one header, one navigation and one width, so only the content changes between tabs. Pages render only their content, never their own header or `<main>`.
  - **Header** (`CabecalhoDoFut`): one slim sticky row (`h-14`, `bg-content1/95`, `border-b`), the mark (links to the fut's home) and the fut switcher; on `md+` the tabs sit on its right, underlined in `accent`. Pads by `env(safe-area-inset-top)`.
  - **Tabs**: **Partidas · Elenco · Você** (`lib/navegacao.ts`). Phones get a fixed bottom tab bar (`BarraDeAbas`, `h-16`, icon + label, active in `foreground` with a small `accent` pill on top, padded by `env(safe-area-inset-bottom)`, `md:hidden`). The page's `<main>` leaves `5rem` + the safe area free below it.
  - **Width**: `max-w-5xl` for every page. Each page uses it its own way: the Elenco is a 2 / 3 / 4-column album, the Partida two columns on `lg` (lists left, Times right, sticky), Partidas and Você a centered reading column.
  - **Routes**: `/g/<slug>` is the next Partida (the app opens there), or the history when none is scheduled; `/partidas` every Partida + Frequência; `/partidas/<id>` one Partida; `/elenco`; `/voce`. Switching futs keeps the tab (`caminhoNoOutroFut`).
  - **Docked controls**: the only thing docked above the tab bar is the Elenco's "Sortear rápido" counter bar while selecting. Every primary action goes at the top of its page ("Nova carta", "Nova partida" in the title row; Vou / Não vou in the Partida's card). No floating action button.
- **The Partida** (`PartidaView`), built so a membro opens it, sees the question and answers:
  - **The card**: "Próxima partida" (on the home), the date, the place, then "Você vai?" with two `size="lg"` buttons. Once answered it shrinks to one pill ("Você vai", "Você está em 2º na lista de espera", "Você não vai") and "Mudar". No Jogador yet: "Escolher meu jogador" in the same spot.
  - **The list**: "x de y vagas" with a bar, then one numbered "Quem vai" list (the group-chat list), the lista de espera under it (dashed). "Não vão" and "Sem resposta" fold into one line ("2 não vão, 5 sem resposta") that opens on a tap.
  - **Times** appear only when there's something to see: published for everyone, the draft and the Sorteio controls for who organizes. With no Times the page is one centered column.
  - **Managing** lives in the card's ⋯ (`MenuDeAcoes`): "Responder por alguém" (a sheet with every Jogador and Vou / Não vou), Editar, Cancelar partida. The list itself has no buttons, for anyone.
  - No live-connection label: the list just updates.
  - **Você** (`/voce`): your Jogador card or "Escolher meu jogador", your Frequência, **Este fut** (your papel and its one-line description, "Pessoas n", "Sair do fut", or for the dono, how to leave), the app, then the account (change password, sign out). It replaces the avatar menu inside a fut; screens outside one (invite, first access) still use `UserMenu`.
  - **Pessoas** (`/pessoas`, lights the Você tab, back link "← Você"): "Quem organiza" and "Membros", one row each (initials, the linked Jogador's name, the email under it for the dono and admins, a papel pill for dono and admins, "você" on your own row). Only the dono's rows for others are buttons: they open the person's sheet (papel as two radio cards, each with what it allows; "Passar o fut pra X" for admins; "Remover do fut"). Then **Convites** (dono and admins), then **O fut** (dono: rename, delete). Steps nobody else can undo (handing over, deleting) ask for the fut's name typed (`ConfirmarComNome`). Papel copy comes from `O_QUE_O_PAPEL_FAZ`, the same everywhere.
- **The installed app (PWA)**: `public/sw.js`, registered by `RegistrarServiceWorker` in production builds.
  - **With no signal** each fut's home and Elenco show their saved copy (saved when opened; pages always try the network first), under one bar at the top of the content: "Sem conexão. Mostrando a lista de 20h15." (`SemConexao`, `bg-warning/15`). Every write is off meanwhile (`useSemConexao` → `SO_LEITURA`), nothing is queued. Pages never saved get `public/offline.html`, a self-contained page in the app's colors.
  - **Install**: "Instalar o app" in Você (the native prompt on Android / desktop Chrome, the Share-menu steps on iPhone; hidden once installed), and one toast, once ever, right after someone's first Vou / Não vou. Never on a first visit, never twice.
  - **Coming back**: after 30 s in the background, or back online, the page reads everything again. Updates are silent; there's no "new version" prompt. No push notifications.
  - Signing out forgets the saved pages.
- **Album**: a tap on a card opens it full size (`CartaAberta`) with its actions (Editar, Excluir, Desvincular conta, "Sou eu"). "Sortear rápido" in the ⋯ menu is a mode where taps tick cards instead. **No hover-only actions anywhere**: a phone has no hover.
- **Auth screen**: `AuthShell` (`components/auth/auth-shell.tsx`) is the one sign-in layout, used by `/` when there's no Sessão and by every `/auth` route (via `app/auth/layout.tsx`). A `bg-background` card (`sm:rounded-3xl`, `shadow-2xl`) floats over a full-bleed night pitch that shows in the margins. Inside: the content column (`max-w-sm`, centered) and an inset pitch picture (`rounded-2xl`, `.on-panel`) on the right, a band on top on mobile. The picture is drawn, not photographed (`NightPitch`: SVG grass grain, mowing stripes, blurred bands of floodlight and shadow, faint markings) and `KickableBall` on top: drag and release to flick it, tap to kick it away from the touched side, Enter/Space to kick from the keyboard; it rolls with grass friction, spins as it rolls and bounces off the picture edges, and under `prefers-reduced-motion` the friction is high enough that it barely rolls, with pill tags top-right ("Futsal", "Society") and a caption bottom-left: mark + `.text-display` line in a single weight (no highlighted word). `AuthPanel` centers mark, title ("Bora pro jogo!") and the inline switch link ("Primeira vez aqui? Criar conta"); fields are `size="lg"` with placeholder + `aria-label`, passwords use `PasswordInput`, the submit is `size="lg" radius="full"`. No links to flows that don't exist (password reset, social login).
- Mobile first: design for the phone, then widen. Everything must work at 375px with no horizontal scroll, and the E2E suite runs the `@mobile` tests on a phone viewport (`playwright.config.ts`).

## Interaction

- Focus: `focus-visible:ring-2 ring-primary` on every interactive element.
- Selection: `ring-2 ring-primary` plus a `primary/10` tint.
- Hover on rows: border shifts toward `primary/40–50`. Hover is a desktop extra, never the only way to reach an action. Cards don't scale on hover.
- Motion: `transition-colors` / `transition-opacity`; `animate-scale-in` for elements that pop in (selection badge); `animate-coin-toss` only for the loader mark.

## Export (Times Sorteados PNG)

The exported image follows the active theme: its background is read from the `--background` token at export time, never a hardcoded color.

- **Layout is a team sheet (súmula)**: header with the lockup, date, player count and the **difference between the highest and lowest average** (the point of a balanced Sorteio). Each Time is one `bg-content1` surface: crest (`team-N` circle with the letter) + name + count, the average as a big `.text-numeral`, then a hairline-divided list (`divide-divider`), no card per row and no numbering (the order is alphabetical, not a sequence). Avatars without a photo show initials.
- Individual ratings are on screen only (`data-export-ignore`); the PNG shows names, positions and team averages. Players are listed **alphabetically**, never in Sorteio order (strongest first), so the list never ranks people.
- `html-to-image` copies the computed style of an `<svg>` root but not of its children, so SVGs inside the export area keep their colors on the root (`color` + inherited `fill`) and children use `currentColor`/inheritance. `Logo` follows this.

## Checklist for a UI change

1. Only tokens, scales and primitives from this file.
2. Checked in light **and** dark, at 375px **and** desktop.
3. `npm run lint`, `npm test`, `npm run build` pass.
