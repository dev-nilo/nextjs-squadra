# Squadra

[![CI](https://github.com/dev-nilo/nextjs-squadra/actions/workflows/ci.yml/badge.svg)](https://github.com/dev-nilo/nextjs-squadra/actions/workflows/ci.yml)

> **In English:** Squadra is a Next.js app for registering soccer players as cards and drawing balanced teams. Every account has its own private roster: Supabase queries are scoped to the signed-in user and enforced by PostgreSQL row-level security. Built with Next.js, TypeScript, Supabase and Vitest. **Live:** [squadra-eight.vercel.app](https://squadra-eight.vercel.app)

Aplicação Next.js para cadastrar Jogadores (estilo carta) e sortear Times balanceados.

**Auth obrigatório:** o Elenco é sempre da conta autenticada (Supabase). Não há modo guest / só-localStorage como produto.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19 + TypeScript
- [Supabase](https://supabase.com/) (Auth + Postgres + Storage)
- Tailwind CSS
- Vitest
- Supabase CLI (migrations versionadas em `supabase/migrations`)

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

Monitoramento de erros (Sentry). Sem DSN o SDK fica inativo, então dev local e CI não precisam de nada disso:

| Variável | Onde | Para quê |
|----------|------|----------|
| `NEXT_PUBLIC_SENTRY_DSN` | Vercel (Production e Preview) | Envia erros do browser e do servidor |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Vercel (build) | Upload dos source maps |

Os eventos saem com a tag `production` (deploy de produção) ou `staging` (previews). O SDK não coleta usuário, cookies, headers nem corpos das requisições (veja [`lib/sentry-options.ts`](lib/sentry-options.ts)).

## Isolamento por Grupo (multi-tenant)

O Elenco pertence a um **Grupo**, e o papel de cada Membro decide o que ele pode fazer, com RLS no Postgres:

| | ler o Elenco | criar, editar e apagar Jogadores | renomear e apagar o Grupo, promover admins |
| --- | --- | --- | --- |
| `dono` | sim | sim | sim |
| `admin` | sim | sim | não |
| `membro` | sim | não | não |
| fora do Grupo | não | não | não |

- Jogadores são lidos e gravados por `grupo_id`. O `user_id` só registra quem criou o Jogador, e ninguém consegue reescrevê-lo.
- As fotos ficam em `player-images/{grupo_id}/`, e só dono e admin gravam ali.
- O cache local (`localStorage`) é separado por Grupo (`fut-cards-players-v2:grupo:<id>`).

A mudança de Elenco por usuário pra Elenco por Grupo foi feita em expand/contract, uma migration e um deploy por passo, sem parar o app: veja [`supabase/migrations`](supabase/migrations) e o [ADR 0003](docs/adr/0003-elenco-belongs-to-a-grupo.md). Os testes de integração em [`tests/integration`](tests/integration) entram com usuários diferentes e conferem cada linha da tabela acima.

## Desenvolvimento

1. Instale as dependências: `npm ci`
2. Configure o `.env.local` (veja [Variáveis de ambiente](#variáveis-de-ambiente))
3. Execute: `npm run dev`
4. Acesse: `http://localhost:3000`

### Banco local (Supabase CLI)

Requer Docker. `npm run db:start` sobe um Supabase local, aplica todas as migrations e roda o [`supabase/seed.sql`](supabase/seed.sql). A saída mostra a URL e a anon key pra colocar no `.env.local`.

Usuários do seed (senha `squadra-dev-123`):

- `dev@squadra.test`: dono do "Fut do Dev", Elenco com 20 Jogadores
- `amigo@squadra.test`: dono do "Fut do Amigo", Elenco com 3 Jogadores (pra conferir o isolamento entre Grupos)
- `novato@squadra.test`: sem Grupo e sem Jogadores, cai na tela "Dê um nome pro seu fut"

Mudanças de schema são sempre uma nova migration (`npx supabase migration new <nome>`), nunca SQL rodado na mão no dashboard.

### Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Sobe o servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build de produção |
| `npm run lint` | Lint (ESLint) |
| `npm run typecheck` | Checagem de tipos (`tsc --noEmit`) |
| `npm test` | Roda os testes (Vitest) |
| `npm run test:watch` | Testes em modo watch |
| `npm run db:start` / `db:stop` | Sobe / derruba o Supabase local |
| `npm run db:reset` | Recria o banco local do zero (migrations + seed) |

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

Scanners (Outlook Safe Links, etc.) abrem os links dos emails sozinhos e queimam o token. Por isso o link leva pra `/auth/confirm`, e a confirmação só acontece quando a pessoa toca em **Confirmar**.

O template está versionado em [`supabase/templates/confirm-signup.html`](supabase/templates/confirm-signup.html), e o Supabase local já usa ele (`supabase/config.toml`). Nos projetos hospedados, vá em **Authentication → Emails → Confirm sign up** e:

- Assunto: `Confirme seu email no Squadra`
- Corpo: cole o conteúdo do arquivo

O link usa `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next={{ .RedirectTo }}`, então o **Site URL** do projeto precisa ser o app que fala com aquele banco.

O `next` traz de volta o destino do cadastro: quem cria a conta a partir de um convite volta pro `/convite/<token>` depois de confirmar, mesmo que confirme em outro aparelho. O `/auth/confirm` só aceita caminhos do próprio site (`lib/convite.ts`, `caminhoSeguro`). Pra isso funcionar, o `https://SEU-DOMINIO.vercel.app/**` precisa estar nas Redirect URLs; sem ele, o Supabase troca o destino pelo Site URL e a pessoa cai em `/`, onde o app ainda a manda pro convite guardado no navegador.

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
supabase/     → config local, migrations, seed
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

`package.json`, `tailwind.config.ts`, `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`, `supabase/config.toml`, `.github/workflows/ci.yml`.

## Documentação adicional

- [`docs/`](docs/) — `CONTEXT.md`, ADRs e docs para agentes
- [`docs/staging.md`](docs/staging.md) — ambientes (local, staging, produção) e como as migrations chegam em cada um
- [`CONTEXT.md`](CONTEXT.md) — glossário de domínio (Jogador, Elenco, Sorteio, Time...)
- [`DESIGN.md`](DESIGN.md) — decisões de design/UI
- [`AGENTS.md`](AGENTS.md) — orientação para agentes de IA neste repo
