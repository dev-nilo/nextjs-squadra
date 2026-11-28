# DESIGN.md

The visual contract for Squadra. Every page and modal is built from the tokens, scales and primitives below. If something you need isn't here, add it here first, then use it.

Stack: Tailwind CSS 4, configured in CSS (there is no `tailwind.config.ts`). The tokens are RGB channels in `app/globals.css` (`:root` and `.dark`), mapped to Tailwind colours in its `@theme inline` block, so `bg-content1/95` still works. The variants `mouse:`, `baixa:` and `dark:` are `@custom-variant`s in the same file, and a small `@layer base` keeps the three v3 defaults v4 changed (border colour, placeholder colour, the pointer cursor on buttons). Font: **Anybody** (`font-sans`, the `--font-anybody` variable from `app/layout.tsx`). Icons: **lucide-react**.

Two v4 behaviours that differ from v3, found in the upgrade (#147):
- An explicit `leading-*` wins over a text size's own line-height, at every breakpoint. `leading-tight sm:text-4xl` keeps 1.25 at `sm`; write the line-height for each size you mean (`sm:text-4xl sm:leading-10`).
- `space-y-*` puts its margin on the earlier sibling and no longer overrides a child's own margin. A `mt-2` inside a `space-y-4` adds up (24px). Use the container's `gap` or `space-y` alone.

---

## Brand

The mark is **Meio-campo**: the pitch's center circle seen from above, split by an S into two equal halves, with the halfway line above and below and the center spot. One drawing says S for Squadra, two Times and a balanced split. Navy ink (`#14213D`) and the album's paper (`#F4F6F1`), with the center spot in the mark's orange (`#FF5B14`). The wordmark "Squadra" is Anybody at weight 900 and 140% width.

- **Component**: `Logo` (`components/ui/logo.tsx`), inline geometric SVG on a 100×100 grid: circle r34 with a 5-unit ring, S halves of r17, halfway stubs, center spot. The spot is the one literal color in a component (`fill="#FF5B14"`): an SVG attribute survives the PNG export, a class wouldn't (see the export notes below). `BrandLockup` is mark + "Squadra" wordmark (`font-black`, `[font-stretch:140%]`, `text-brand`), in the fut's header.
- **Small variant** for 16/32px (`public/icon.svg`, `icon-*-32x32.png`): no stubs and no spot, circle r44 with a 9-unit ring, so the S survives at tab size. Don't use the full mark below ~24px.
- **Where it appears**: the fut's header, the auth panel (inverted via `.on-panel`), the exported Times Sorteados PNG, the loader (`LoadingState` flips the mark like a coin toss, `animate-coin-toss`, still under `prefers-reduced-motion`), `TelaDeAviso` and the empty Elenco state.
- **Not** used as a decorative motif elsewhere.
- **Static assets** (`public/icon.svg`, `icon-*-32x32.png`, `apple-icon.png`, `icon-192/512.png`, `icon-maskable-192/512.png`, `app/opengraph-image.png`) still carry the previous cream; they're redrawn in the album's colors with the shell (#150).

## Theme: Álbum

Chosen on 2026-11-28 from three prototyped directions (#146). **The fut is an album the group fills every week**: each Partida is a page whose vagas are slots, each Jogador a sticker. Everything follows from that:

- **Light** is the album's page: cool paper (`#F4F6F1`, never cream) printed in navy ink (`#14213D`). Cards, modals, menus and the header are **white stickers** on it (`content1`).
- **Dark** is the album at night: a deep green-black page (`#0E1712`), the ink turned light (`#E8EFE6`), stickers in a lifted green-grey (`#18241D`). Never a tinted near-black.
- **The album's green** (`#0F7A47`) is the band around every figurinha and the Sorteio's action. **Gold** is only the brilhante's foil. **The mark's orange** only marks "you". Nothing else is colored.
- Light and dark follow the OS (`next-themes`, `defaultTheme="system"`, class strategy). There is no toggle. Every token has a light value under `:root` and a dark value under `.dark`; only use tokens, so both themes stay correct for free. Any change must be checked in **both** themes.
- What carried over from the previous identity: the name, the mark, the carta with OVR and attributes, the three tabs. The layouts of the album idea (vagas as slots, the figurinha's photo window, the binder-index tabs) arrive module by module (M3–M7) and with the shell (#150); this file describes what's built.

**The figurinha** (`PlayerCard`): a **white sticker in the album's green frame** (`paper`, `paper-borda`), printed in one navy ink, the same in both themes because it's printed. Nothing on it that a cheap sticker printer couldn't print: no gradients, no glow.
  - **No photo** (most of the pelada): no empty photo window. The OVR, printed huge (`.text-numeral`, 36cqw), is the card's face; the position in words under it ("atacante", "ala", "fixo", "goleiro").
  - **With a photo**: the photo fills the card down to a name strip (the OVR at 17cqw, the name on one line, flag and position), behind one navy rule. It prints in the same ink (a navy/white duotone: grayscale multiplied onto the paper, navy lightened in), so phone photos of every kind sit together, anchored at the top so the face stays in. Its attributes come up over the photo (the back of the sticker): on **hover** where there's a mouse, on a **tap** anywhere (another tap turns it back). In Você the card is `completa`: the photo becomes 4:5 and the attribute table sits under the strip. Uploads are cropped to 3:4, 600×800, keeping the top (`lib/player-image-processing.ts`).
  - The name in sentence case, bold, left-aligned, then one navy rule.
  - The attributes in one ink, lowercase labels: the Jogador's **two best** (`pontosFortes`) in full weight, the rest at 70% ink (AA on white). The flag and position line is at 70% too. No traffic-light colors.
  - From OVR 85 (`OVR_BRILHANTE`) it's a **brilhante**: the OVR, the rule and a double frame printed in gold foil (`paper-ouro`, 5.4:1 on white). Flat, never animated.
  - "você" is an orange pill after the name; selected is an orange ring plus a check. The card's ⋯ is a green button with white dots, in the frame's color.
  - Every size is in `cqw` (the card is its own inline-size container), so the same card works in the 2-column album, opened, and in Você. No hover scale.
  - **A small card** (under 160px wide: the 2-column album on a 280–340px phone) shows only its face: OVR, flag and position, name. Like a photo card, it turns on a tap (or hover with a mouse). CSS (`@container(max-width:160px)`) hides the table on the first paint, and a `ResizeObserver` makes the card a button that turns.

## Color tokens

The names describe a role, not a hue, and every pair below meets WCAG AA in both themes (checked by `e2e/acessibilidade.spec.ts`, axe on every page of a fut).

| Token | Use |
|-------|-----|
| `background` / `foreground` | The album's page (`#F4F6F1` / `#0E1712`) and the ink (navy `#14213D` / `#E8EFE6`) |
| `content1` | **Stickers**: cards, modals, menus, the header (white / `#18241D`) |
| `content2`–`content4` | Nested and raised fills, in the page's green-grey |
| `default-50…900`, `default` | Neutrals, cool greys leaning to the page's green: input fills (`default-100`), borders (`default-200/300`), muted text (`default-400/500/600`, all ≥5.4:1 on the page) |
| `divider` | Hairlines and borders between regions |
| `primary` (+ `50…900`) | **The ink**: navy in light, the light ink in dark. Main action, selection, focus. `primary-600` is the solid hover. |
| `secondary` | **The album's green** (`#0F7A47`, white text 5.4:1; `#4CC487` with dark text in dark). **Only the Sorteio's actions** ("Sortear times", "Sortear", "Sortear de novo"). |
| `accent` / `accent-foreground` | **The mark's orange** (`#FF5B14`; `#FF7A40` in dark): **"you" only**: the active tab's mark, the "você" pill, your row, the "Qual desses é você?" banner (`bg-accent/10`) and the logo's center spot. A fill under navy text (5.1:1) or a non-text mark. **Never text on the page.** Never for actions (`primary`) or errors (`danger`). |
| `paper` / `paper-foreground` | **Only the figurinha**: the white sticker and its navy ink. Same in both themes. |
| `paper-borda`, `paper-ouro` | **Only the figurinha**: the album-green frame, and the brilhante's gold foil. Same in both themes. |
| `brand` / `brand-foreground` | **Logo only**: the mark's ink and paper, swapped in dark. Never for UI actions (that's `primary`). |
| `panel` / `panel-foreground` | The auth picture: the court at night, deeper than the page in dark. Wrap it in `.on-panel` so the mark inverts on it. |
| `danger` | Brick red. Destructive actions and errors |
| `warning` / `warning-600` | Ochre. Warnings (`warning-600` for text on `warning/10`) |
| `success` | Petrol, kept apart from the album's green. Positive confirmation and high attributes |
| `overlay` | Modal backdrop scrim, used as `backdrop:bg-overlay/50` |
| `team-1…6` | Kit colors for Times, by index: navy, brick, pitch green, ochre, petrol, wine. Lighter in dark. **Only** for team identity (the crest), never semantic. |

Rules:
- No raw Tailwind palette colors (`gray-*`, `zinc-*`, `white`, `black`, `red-*`…) and no arbitrary hex classes (`bg-[#…]`) in `app/`, `components/`, `lib/` or `src/`; ESLint enforces this on class strings. The only hex literals are the manifest and theme colors and the logo's center spot.
- Tints use opacity on a token: `bg-primary/10`, `border-danger/20`.
- Team colors (`getTeamPresentation` in `lib/constants.ts`) cycle through `team-1…6`. Never use `danger`/`success` for a Time: a red team reads as an error.
- Attribute values use `getStatColor` (`lib/stat-color.ts`): ≥80 `success`, ≥70 `primary`, ≥50 `warning-600`, else `danger`.

## Typography

One family, **Anybody**, loaded with its variable width axis (`wdth` 50–150, `next/font`, `--font-anybody`). **Its width carries the voice**: wide for what you read at a glance (titles, numerals, the wordmark), normal for reading, condensed for a name that has to fit. Anybody's lowercase is tall: its capital S stands barely above the s. That's the face, not a bug.

Scale (Bringhurst): **12 · 14 · 16 · 18 · 24 · 36 · 48** (`text-xs`, `sm`, `base`, `lg`, `2xl`, `4xl`, `5xl`). ESLint bans `text-xl` (20), `text-3xl` (30) and `text-6xl` up, arbitrary sizes (`text-[10px]`; `cqw` sizes on the figurinha are fine) and arbitrary families (`font-[…]`).

Named classes, defined in `@layer components` in `app/globals.css`. Use the class, not the raw utilities.

| Class | Equals | Use |
|-------|--------|-----|
| `.text-title` | `text-2xl font-extrabold tracking-tight`, width 115% | Page and modal titles (one per screen). The Partida's date, the longest title, is at 100% on phones so it stays on one line. |
| `.text-section` | `text-lg font-bold`, width 110% | Section headings inside a page/modal |
| `.text-label` | `text-sm font-semibold text-default-500`, width 90% | A heading over a list or group ("Próximas", "Times", "Não vão"), in sentence case |
| `.text-muted` | `text-sm text-default-500` | Subtitles, helper text, empty states |
| `.text-numeral` | weight 900, width 135%, tabular, tight | **Printed numerals**, like an album's sticker numbers: OVR, "8 de 14", Time averages, the Sorteio spread. Combine with a size from the scale. |
| `.text-display` | `text-2xl sm:text-4xl font-normal leading-tight tracking-tight` | **Only** the auth picture caption, in a single weight |

Weights: body 400, labels and names in lists 500–600, section headings 700, titles 800, numerals and the wordmark 900.

## Copy

- **Sentence case** everywhere a person reads: buttons, titles, labels ("Sortear times", "Nome do jogador", "Nova partida"). Acronyms stay as they are (VEL, ATA, CSV, OVR).
- **Domain terms are lowercase in UI copy** ("Essa partida já começou", "Seu jogador entrou no elenco"). They're capitalized in code, docs and CONTEXT.md only. A tab or page name at the start of a line is just sentence case ("Elenco", "Partidas").
- **No all-caps labels** and no tracked-out eyebrows above headings: use `.text-label`.
- **No middle-dot meta strings** ("A · B · C"). Write it as a phrase: "ATA, OVR 75", "18%, 3 de 10", "Link de convite, vale até 19/11". Browser `<title>`s ("Elenco · Squadra") are the one exception.
- **Numbering only where order is real**: the presence list (confirmation order and slots), never an alphabetical list.
- Voice is the group's: plain verbs, short, no exclamation marks in system feedback ("Você entrou.", not "Login realizado com sucesso!").
- **System messages say what happened, then what to do** ("Email ou senha errados." / "Confira os dois, ou use Esqueci minha senha."). Never "Erro", "Algo deu errado" or "com sucesso". A failure with no answer from the server says "Confira a conexão e tente de novo." Supabase's English never reaches the screen: `explicarErro` (`lib/sessao.ts`) turns it into Portuguese, and an unknown message becomes "Tente de novo em instantes." Explain a cause once, where it matters: the mail scanner that spends a link is in "Esse link não vale mais", not in every auth message.
- **Real plurals**, never "(s)": "1 jogador pronto", "3 linhas com aviso". Counts out of a total are "8 de 14", not "8/14". "…" is one character, never "...".
- A field that's missing says so **next to the field** (an `Alert` the field points to with `aria-describedby`), not in a toast. A placeholder never repeats a visible label.

## Radius scale

| Radius | Role |
|--------|------|
| `rounded-2xl` | **Surfaces**: modals, page cards (`Surface`) |
| `rounded-xl` | **Controls and inner blocks**: buttons, inputs, selects, Time cards, info panels |
| `rounded-lg` | **Small items**: alerts, list rows, draggable rows, menu items, image previews |
| `rounded-full` | Avatars, badges, round icon buttons |

The **only exception** is the Jogador card (`PlayerCard`): its radii are in `cqw` (6cqw outside, 4cqw for the paper) so they scale with the card, like a die-cut sticker.

## Elevation

- `shadow-2xl` for floating surfaces (modals, page cards, menus, Jogador card).
- `shadow-lg` for the sticky header and floating badges/buttons over a card.
- `shadow-sm` for images inside a card.

## Primitives (`components/ui/`)

| Primitive | Notes |
|-----------|-------|
| `Button` | `color`: `primary` · `secondary` (Sorteio only) · `danger` · `default`. `variant`: `solid` (main action) · `flat` (secondary action, e.g. Cancelar, Voltar) · `light` (tertiary / inline / icon). `size`: `sm` · `md` · `lg`. Supports `isLoading`, `isIconOnly`, `radius="full"`, `startContent`. One `solid` primary or secondary per action group. Every variant has a pressed (`active:`) state. `sm` buttons and small icon buttons keep their look, but an invisible `::after` stretches the tap area to 44px. **An icon on a text button only where it says something the words don't**: the Sorteio's `Shuffle`, what creates (`Plus` on Nova carta, `CalendarPlus` on Nova partida, `Link2` on Gerar link novo), `Trash2` on what deletes, ✓ and ✗ on Vou / Não vou, ⇆ to move a Jogador. Not on Salvar, Sair, Alterar senha, Baixar PNG, Remover do fut: there it's decoration. Icon-only buttons and menu items keep theirs. |
| `Input`, `Select` | `rounded-xl`, `bg-default-100`, `border-default-200`, focus ring `primary`. Always pass `label` or `aria-label`. `Input` sizes `sm` · `md` · `lg` (auth); `endContent` is an interactive trailing slot. Text is **16px under a finger** and 14px only with a mouse (`text-base mouse:text-sm`). iOS zooms the page in on any field under 16px and stays zoomed. This applies to every field, raw `<input>`/`<select>` included. |
| `PasswordInput` | `Input` with a show/hide toggle (`aria-pressed`). Use for every password field. |
| `Modal`, `ModalHeader`, `ModalBody`, `ModalFooter` | Native `<dialog>`, at most `100dvh - 1rem` tall: the body scrolls between a fixed header and footer. Header holds a `.text-title` and optional `.text-muted` subtitle. Footer: secondary action (`flat`) first, primary action last; full width on mobile. A form modal passes `onSubmit` (and `noValidate`) to `Modal`, which then renders itself as the `<form>`. Never wrap `ModalBody`/`ModalFooter` in a `<form>` of your own: it breaks the column, the body stops scrolling and the footer falls off a short screen. **On a phone (below `sm`) it's a sheet**: full width at the bottom, rounded only on top, padded clear of the home indicator, sliding up as it opens (`subir`, none with reduced motion). No drag handle, because it can't be dragged. A long list in a modal scrolls with the modal's body, never in a box of its own, with its search field sticky at the top. |
| `MenuDeAcoes` | The ⋯ button and its popover menu. It opens under the button, aligned to its right edge, moved in to stay 8px inside the screen, and above the button when there's no room under it (`lib/posicao-do-menu.ts`, `useMenuFlutuante`). It closes on scroll or rotation. The account menu (`UserMenu`) uses the same placement. |
| `MoverJogador` | Moves a Jogador to another Time: a 32px two-arrow mark (`ArrowLeftRight`) with the native `<select>` invisible over it (16px text, 44px tap area). A tap opens the phone's own picker, and the row keeps its width for the name. Used in the Partida's Sorteio and the quick one. |
| `Surface` | Page-level card: `rounded-2xl bg-content1 shadow-2xl p-4 sm:p-6`. Use for any standalone content block outside a modal. |
| `TelaDeAviso` | A screen that stands in for a page: a failed load, an address that doesn't exist, a fut you're not in, a dead invite (`error`, `global-error`, `not-found`, `ErroAoAbrirFut`, `FutNaoEncontrado`, the invite's problems). The mark, one `.text-title`, one `.text-muted` sentence on what happened, then the way out: "Tentar de novo" (primary, `lg`, `radius="full"`) when trying again can help, and always a link to `/` ("Ir pro meu fut"; "Ir pro Squadra" on an invite, where the person may have no fut yet), so the installed app never ends in a dead end. `public/offline.html` is the same screen by hand. |
| `Alert` | Inline status box, `tone`: `danger` · `warning` · `success` · `info`. `rounded-lg`, `bg-<tone>/10`, `text-sm font-medium`. Use instead of hand-rolled colored boxes. |
| `FullScreenLoader` | Centered coin-tossing mark + label on `bg-background`, full viewport. The only loading state for routes and route-level fallbacks. |
| `PlayerAvatar` | Round avatar with image → icon → initials fallback. |
| `Logo`, `BrandLockup` | See **Brand**. |

## Layout

- **App shell**: `app/layout.tsx` renders the single `<Toaster position="top-center" richColors theme="system" />`. Pages never render their own Toaster. Toast colors are remapped to the tokens in `app/globals.css` (sonner's `--normal-*`, `--success-*`, `--error-*`… variables), so they follow the palette.
- **The fut's frame** (`app/g/[slug]/layout.tsx` → `FutShell`): every page inside a fut shares one header, one navigation and one width, so only the content changes between tabs. Pages render only their content, never their own header or `<main>`.
  - **Side margins**: `.margem-lateral` (`0.75rem`, `1.5rem` from `sm`) or the notch's inset, whichever is wider. An iPhone on its side puts the notch on the left or right, and iOS ignores the manifest's orientation. The header, `main` and every docked bar use it. Fixed bars also pad by `env(safe-area-inset-left/right)` and by the bottom inset.
  - **Scrolling**: only `html` clips horizontal overflow (`overflow-x: clip`). Overflow on `body` would make it its own scroll container, and `position: sticky` (the header, the Partida's Times) would then have nothing to stick to.
  - **Header** (`CabecalhoDoFut`): one slim sticky row (`h-14`, `bg-content1/95`, `border-b`), the mark (links to the fut's home) and the fut switcher; on `md+` the tabs sit on its right, underlined in `accent`. Pads by `env(safe-area-inset-top)`.
  - **Tabs**: **Partidas · Elenco · Você** (`lib/navegacao.ts`). Phones get a fixed bottom tab bar (`BarraDeAbas`, `h-16`, icon + label, active in `foreground` with a small `accent` pill on top, padded by `env(safe-area-inset-bottom)`, `md:hidden`). The page's `<main>` leaves `5rem` + the safe area free below it.
  - **Width**: `max-w-5xl` for every page. Each page uses it its own way: the Elenco is a 2 / 3 / 4-column album, the Partida two columns from `md` (a tablet standing up: lists left, Times right; 3:2 from `lg`). The Times column stays in view (sticky) and scrolls on its own when it's taller than the screen. Inside it, two Times sit side by side only when the column is at least 30rem wide (a container query), never by screen width. Partidas and Você are a centered reading column.
  - **Routes**: `/g/<slug>` is the next Partida (the app opens there), or the history when none is scheduled; `/partidas` every Partida + Frequência; `/partidas/<id>` one Partida; `/elenco`; `/voce`. Switching futs keeps the tab (`caminhoNoOutroFut`).
  - **Docked controls**: the only thing docked above the tab bar is the Elenco's "Sortear rápido" counter bar while selecting. Every primary action goes at the top of its page ("Nova carta", "Nova partida" in the title row; Vou / Não vou in the Partida's card). No floating action button.
- **The Partida** (`PartidaView`), built so a membro opens it, sees the question and answers:
  - **The card**: "Próxima partida" (on the home), the date, the place, then "Você vai?" with two `size="lg"` buttons. Once answered it shrinks to one pill ("Você vai", "Você está em 2º na lista de espera", "Você não vai") and "Mudar". No Jogador yet: "Escolher meu jogador" in the same spot.
  - **The list**: "x de y vagas" with a bar, then one numbered "Quem vai" list (the group-chat list), the lista de espera under it (dashed). "Não vão" and "Sem resposta" fold into one line ("2 não vão, 5 sem resposta") that opens on a tap.
  - **Times** appear only when there's something to see: published for everyone, the draft and the Sorteio controls for who organizes. With no Times the page is one centered column.
  - **Sharing**: while the Partida is open, everyone gets a share button (`Share2`, icon-only, left of the ⋯) in the card. It hands the group chat the same numbered list as text, with the date in WhatsApp bold, the vagas, the lista de espera and the link to answer (`textoDaPartida`), so the message reads on its own for someone not in the app yet. On a touch screen it opens the share sheet; elsewhere (desktop, where the sheet seldom lists WhatsApp) it copies ("Lista copiada", for WhatsApp Web). The last line, "Quem já está no fut responde aqui", is honest about who the link works for.
  - **Managing** lives in the card's ⋯ (`MenuDeAcoes`): "Responder por alguém" (a sheet with every Jogador and Vou / Não vou), Editar, Cancelar partida. The list itself has no buttons, for anyone.
  - No live-connection label: the list just updates.
  - **In Partidas** (`/partidas`), a cancelled Partida keeps its row: the date struck through and a "Cancelada" pill. Nothing is faded: a row at 60% opacity took the place and the pill under AA contrast.
  - **Você** (`/voce`): your Jogador card or "Escolher meu jogador", your Frequência, **Este fut** (your papel and its one-line description, "Pessoas n", "Sair do fut", or for the dono, how to leave), the account (change password, sign out), then the app ("Instalar o app"). The app section comes last because the browser only knows after loading whether it can install, so it can't push anything below it. It replaces the avatar menu inside a fut; screens outside one (invite, first access) still use `UserMenu`.
  - **Pessoas** (`/pessoas`, lights the Você tab, back link "← Você"): "Quem organiza" and "Membros", one row each (initials, the linked Jogador's name, the email under it for the dono and admins, a papel pill for dono and admins, "você" on your own row). Only the dono's rows for others are buttons: they open the person's sheet (papel as two radio cards, each with what it allows; "Passar o fut pra X" for admins; "Remover do fut"). Then **Convites** (dono and admins), then **O fut** (dono: rename, delete). Steps nobody else can undo (handing over, deleting) ask for the fut's name typed (`ConfirmarComNome`). Papel copy comes from `O_QUE_O_PAPEL_FAZ`, the same everywhere.
- **The installed app (PWA)**: `public/sw.js`, registered by `RegistrarServiceWorker` in production builds.
  - **With no signal** every tab of a fut (the home, Partidas, Elenco, Você) and the last 5 Partidas opened (links from the group chat) show their saved copy. A page is saved when opened; pages always try the network first. **Signal that doesn't carry data** counts as none: a page with a saved copy waits 3.5 s for the network, then shows the copy. A tab tapped inside the app gives up just as fast, and the next wait is 0.5 s. A copy served that way carries `<meta name="squadra-copia-salva">`, so the app knows even when the phone says it's online.
  - The **offline bar** sits at the top of the content and stays under the header while scrolling: "Sem conexão. Mostrando a lista de 20h15." (`SemConexao`, `bg-warning/15` on the canvas), with "Tentar de novo". Every write is off meanwhile (`useSemConexao` → `SO_LEITURA`), and nothing is queued. A page shown from its copy checks every 15 s whether the network answers, and reloads into the live page when it does.
  - Pages never saved get `public/offline.html`. It's self-contained, in the app's token colours, with "Tentar de novo" and "Abrir meu fut" (with no signal, "/" goes to the last fut saved).
  - **What gets saved**: only page content that rendered for a member carries the mark (`MarcaOffline`, in each page, never the layout), so an error page never replaces a good copy. "Esse fut não existe" (`data-fut-fora`) forgets that fut's pages, and so does leaving or deleting it. Photos and flags load with `crossOrigin="anonymous"` and lazily, so they're kept as real responses: an opaque one costs megabytes of quota. A full disk never breaks a page; it just isn't kept.
  - **Install**: "Instalar o app" in Você, and one toast, once ever, right after someone's first Vou / Não vou. Never on a first visit, never twice. Either way it ends in "Pronto, o Squadra está na sua tela inicial." What it offers:
    - Android / desktop Chrome: the native prompt.
    - iPhone: the Share-menu steps, which work in Safari, Chrome and Firefox, plus the warning that the app asks you to sign in once (it keeps its own storage apart from the browser's).
    - Instagram, Facebook, TikTok and other in-app browsers, which can't install: "Abra este link no Safari / no Chrome".
    - Hidden once installed.
  - **The frame around it** (`app/manifest.ts`): the splash and its status bar are navy (`#14213D`), which the cream icon stands out on. Then each page's `theme-color` takes over: on fut pages it's the header's color (`content1`, `#FFFFFF` / `#1B2A4C`), so status bar and header read as one bar; elsewhere it's the canvas. There's no orientation lock: iOS ignores one, so every screen has to work on its side anyway. A link opened from the group chat lands in the open app (`launch_handler: navigate-existing`). The manifest's screenshots (two phone, one wide) feed Chrome's richer install dialog; `scripts/capturas-do-manifest.mjs` takes them again from the seeded local app.
  - **No iOS startup images**: each iPhone size needs its own PNG, a dozen files for a splash shown for under a second. iOS shows a blank screen in the background color instead.
  - **Coming back**: after 30 s in the background, or back online, the page reads everything again, and the service worker checks for a new version (an installed app seldom loads a page in full). Updates are silent; there's no "new version" prompt. No push notifications.
  - Signing out forgets every saved page; leaving a fut forgets that fut's.
- **Album**: nothing opens full size. Each card's actions ("Sou eu", Editar, Desvincular conta, Excluir, whichever this person may do) are in a small ⋯ at its top-right corner, a sibling of the card face (never a button in a button); no ⋯ when there's nothing to do. A tap turns a photo card to show its attributes; a card with no photo already shows them. "Sortear rápido" in the Elenco's ⋯ menu is a mode where taps tick cards instead (and the cards' ⋯ hide). **No hover-only actions anywhere**: hover only previews what a tap also shows, because a phone has no hover.
- **Auth screen**: `AuthShell` (`components/auth/auth-shell.tsx`) is the one sign-in layout, used by `/` when there's no Sessão and by every `/auth` route (via `app/auth/layout.tsx`). A `bg-background` card (`sm:rounded-3xl`, `shadow-2xl`) floats over a full-bleed night pitch that shows in the margins. Inside: the content column (`max-w-sm`, centered) and an inset pitch picture (`rounded-2xl`, `.on-panel`) on the right, a band on top on mobile. The picture is drawn, not photographed (`NightPitch`: SVG grass grain, mowing stripes, blurred bands of floodlight and shadow, faint markings) and `KickableBall` on top: drag and release to flick it, tap to kick it away from the touched side, Enter/Space to kick from the keyboard; it rolls with grass friction, spins as it rolls and bounces off the picture edges, and under `prefers-reduced-motion` the friction is high enough that it barely rolls, and a caption bottom-left: mark + `.text-display` line in a single weight (no highlighted word). `AuthPanel` centers mark, title ("Bora pro jogo!") and the inline switch link ("Primeira vez aqui? Criar conta"); fields are `size="lg"` with placeholder + `aria-label`, passwords use `PasswordInput`, the submit is `size="lg" radius="full"`. "Esqueci minha senha", a quiet link under Entrar, turns the panel into "Recuperar a senha" (email, "Enviar link"). The emailed link ends on `/auth/nova-senha`, in the same shell. No links to flows that don't exist (social login).
- Mobile first: design for the phone, then widen. Everything must work from **280px** (a folded Fold) with nothing past the screen's edge. Where a row doesn't fit, it wraps: Elenco's title and its actions, search over sort under 340px, and Frequência with name and number on one line and the bar under them. The E2E suite runs the `@mobile` tests on a phone viewport and `@telas` on a phone, a phone lying down and a tablet (`playwright.config.ts`); `e2e/telas.spec.ts` also checks 280px and an 820px tablet.
- **Short screens** (`baixa:`, `max-height: 500px`, a phone lying down): the header and the tab bar go to 48px, and the tab bar shows only its icons (the names stay for screen readers). The auth screen puts the form and the picture side by side, as on a laptop, so the first field is on screen. Anything docked above the tab bar follows its height.

## Interaction

- Focus: `focus-visible:ring-2 ring-primary` on every interactive element, menu items included.
- **Touch**: hover styles only apply where there's a mouse (Tailwind 4's `hover:` checks `(hover: hover)`), so nothing stays "hovered" after a tap. Pressed feedback is `active:`. There's no tap highlight (`-webkit-tap-highlight-color: transparent`). The header and tab bar can't be selected or long-pressed into a link preview. Installed, the page doesn't rubber-band (`overscroll-behavior-y: none` under `display-mode: standalone`).
- **Tap areas are 44px or more.** Where the visible control is smaller (⋯, share, back links, "Criar conta"), an invisible area makes up the rest without moving the layout: `Button`'s own `::after`, `.area-de-toque` for text links and inline buttons, and `.slider` for ranges (24px thumb, 44px tall).
- `mouse:` (`pointer: fine`) is for what only makes sense with a mouse ("ou arraste", 14px fields). Never decide that by width: a tablet is wide and has no mouse. `mouse:` and `baixa:` are `@custom-variant`s in `app/globals.css`, not breakpoints, so they never interfere with `sm:` or `max-*`.
- `Button` heights are minimums: a long label ("Passar o fut pra …") wraps inside the button. `lg` is `px-4` on phones, so "Não vou" fits half the Partida's card.
- Selection: `ring-2 ring-primary` plus a `primary/10` tint.
- Hover on rows: border shifts toward `primary/40–50`. Hover is a desktop extra, never the only way to reach an action. Cards don't scale on hover.
- Dragging is a desktop extra too. A Jogador moves between Times with a select beside their name ("Mover <nome>"), in the Partida's Sorteio and in the quick one; the quick one also lets a mouse drag the row.
- Motion: `transition-colors` / `transition-opacity` for state, `subir` for a phone's sheet, `animate-coin-toss` only for the loader mark. All off under `prefers-reduced-motion`.

## Export (Times Sorteados PNG)

The exported image follows the active theme: its background is read from the `--background` token at export time, never a hardcoded color.

- **Layout is a team sheet (súmula)**: header with the lockup, date, player count and the **difference between the highest and lowest average** (the point of a balanced Sorteio). Each Time is one `bg-content1` surface: crest (`team-N` circle with the letter) + name + count, the average as a big `.text-numeral`, then a hairline-divided list (`divide-divider`), no card per row and no numbering (the order is alphabetical, not a sequence). Avatars without a photo show initials.
- Individual ratings and the move selects are on screen only (`data-export-ignore`); the PNG shows names, positions and team averages. Players are listed **alphabetically**, never in Sorteio order (strongest first), so the list never ranks people.
- `html-to-image` copies the computed style of an `<svg>` root but not of its children, so SVGs inside the export area keep their colors on the root (`color` + inherited `fill`) and children use `currentColor`/inheritance. `Logo` follows this.

## Checklist for a UI change

1. Only tokens, scales and primitives from this file.
2. Checked in light **and** dark, at 375px **and** desktop.
3. `npm run lint`, `npm test`, `npm run build` pass.
4. Anything that changes the frame (header, bars, modals, menus) is covered by `e2e/telas.spec.ts`, which runs on desktop, a phone, a phone on its side (`landscape`, 360px tall) and a tablet.
