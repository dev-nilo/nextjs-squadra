# Squadra

Aplicação Next.js para cadastrar Jogadores (estilo carta) e sortear Times balanceados.

**Auth obrigatório:** o Elenco é sempre da conta autenticada (Supabase). Não há modo guest / só-localStorage como produto.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19 + TypeScript
- [Supabase](https://supabase.com/) (Auth + Postgres + Storage)
- Tailwind CSS
- Vitest

## Pré-requisitos

- Node.js na versão indicada em `.nvmrc` (`lts/iron`, atualmente Node 20)
- Um projeto Supabase (URL + anon key)

## Variáveis de ambiente

Crie um arquivo `.env.local` na raiz com:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key

# Opcional — recomendado em produção (veja seção "Auth Supabase" abaixo)
NEXT_PUBLIC_SITE_URL=https://SEU-DOMINIO.vercel.app
```

## Isolamento por usuário (multi-tenant)

Cada conta só vê/edita/apaga **os próprios** Jogadores:

- Consultas e writes no Supabase sempre filtrados por `user_id = auth.uid()`
- Cache local (`localStorage`) separado por usuário (`fut-cards-players-v2:user:<id>`)
- Sem upload automático de dados de outro usuário para a nuvem da conta atual

Rode no SQL Editor do Supabase (obrigatório em produção):

```bash
scripts/06_harden_user_isolation.sql
```

## Desenvolvimento

1. Instale as dependências: `npm ci`
2. Configure o `.env.local` (veja [Variáveis de ambiente](#variáveis-de-ambiente))
3. Execute: `npm run dev`
4. Acesse: `http://localhost:3000`

### Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Sobe o servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build de produção |
| `npm run lint` | Lint (ESLint) |
| `npm test` | Roda os testes (Vitest) |
| `npm run test:watch` | Testes em modo watch |

## Auth Supabase (confirmação de email)

Se o link do email redirecionar com `otp_expired` / `Email link is invalid or has expired`, configure o projeto assim:

### 1. URL Configuration (Dashboard → Authentication → URL Configuration)

- **Site URL**
  - Local: `http://localhost:3000`
  - Produção: `https://SEU-DOMINIO.vercel.app`
- **Redirect URLs** (adicione todas):
  - `http://localhost:3000/**`
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/confirm`
  - `https://SEU-DOMINIO.vercel.app/**`
  - `https://SEU-DOMINIO.vercel.app/auth/callback`
  - `https://SEU-DOMINIO.vercel.app/auth/confirm`

### 2. Template de confirmação (anti-prefetch)

Scanners (Outlook Safe Links, etc.) abrem `{{ .ConfirmationURL }}` sozinhos e queimam o token.

Em **Authentication → Email Templates → Confirm sign up**, use:

```html
<h2>Confirme seu email</h2>
<p>Clique no link abaixo. Na página aberta, pressione o botão Confirmar.</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?confirmation_url={{ .ConfirmationURL }}">
    Confirmar email
  </a>
</p>
```

Alternativa com `token_hash`:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">
  Confirmar email
</a>
```

### 3. Variável opcional em produção

No Vercel, defina `NEXT_PUBLIC_SITE_URL=https://SEU-DOMINIO.vercel.app`.

### 4. Depois de ajustar

1. Apague o usuário pendente em Authentication → Users (se necessário).
2. Cadastre de novo **ou** use **Reenviar email de confirmação**.
3. Abra o email **mais recente** e confirme pelo botão na página `/auth/confirm`.

## Visão geral da estrutura

```
app/          → páginas (rotas)
components/   → UI (auth, player, team)
hooks/        → adapter React da Sessão
lib/          → domínio + persistência + Supabase
types/        → Jogador (Player), Time, Attributes
docs/         → CONTEXT.md, ADRs, agent docs
```

### `app/`

| Caminho | Função |
|---------|--------|
| `layout.tsx` | Cascão (fonte, providers, analytics) |
| `providers.tsx` | NextUI + tema |
| `page.tsx` | Tela principal — Elenco, edição, Sorteio |
| `loading.tsx` | Loading |
| `auth/page.tsx` | Login/cadastro |
| `auth/callback/` | Confirmação / PKCE |
| `auth/confirm/` | Confirmação anti-prefetch |
| `globals.css` | Estilos globais |

### `components/`

- **`auth/`** — formulário, modal, menu do usuário, error watcher
- **`player/`** — card, modal de criar/editar, sliders
- **`team/`** — config do Sorteio e Times sorteados

### `lib/`

- **`supabase/`** — client (browser) e server (cookies)
- **`elenco.ts`** — load/save/delete/sync do Elenco (auth-only)
- **`jogador.ts`** — normalize / OVR
- **`sorteio.ts`** — Sorteio attribute-sum
- **`sessao.ts`** — login, signup, logout, confirmação
- **`player-utils.ts`** — localStorage + processImage
- **`player-supabase.ts`** / **`player-image.ts`** — sync e Storage
- **`auth-url.ts`**, **`constants.ts`**, **`countries.ts`**

### `hooks/` e `types/`

- **`hooks/use-auth.ts`** — adapter React da Sessão
- **`types/index.ts`** — `Player`, `Time`, atributos, posições

## Fluxo do app

1. Usuário abre `/` → precisa estar autenticado.
2. Carrega o Elenco (nuvem + cache local da conta).
3. Cria/edita/exclui Jogadores; sync manual se quiser.
4. Seleciona Jogadores → configura Sorteio → Times balanceados.

## Config (raiz)

`package.json`, `tailwind.config.ts`, `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`.

## Documentação adicional

- [`docs/`](docs/) — `CONTEXT.md`, ADRs e docs para agentes
- [`CONTEXT.md`](CONTEXT.md) — glossário de domínio (Jogador, Elenco, Sorteio, Time...)
- [`DESIGN.md`](DESIGN.md) — decisões de design/UI
- [`AGENTS.md`](AGENTS.md) — orientação para agentes de IA neste repo
