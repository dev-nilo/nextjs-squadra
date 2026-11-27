# Code is organized in modules by context, with layers inside each

The code moves out of the flat `lib/`, `components/`, `hooks/` and `types/` into one module per domain context, under `src/modulos/`:

- `sessao`: sign-in, sign-up, email confirmation, password recovery.
- `grupo`: the Grupo, its Membros and papéis, `capacidades`, and the Convite. A Convite only exists to join a Grupo, so it isn't a module of its own.
- `elenco`: the Jogador and their carta, linking an account, photos, CSV import.
- `partida`: the Partida, Presença, lista de espera, Frequência, and the live Partida.
- `sorteio`: the balancing algorithm, a Partida's Sorteio, and the quick Sorteio.

What more than one module uses goes in `src/compartilhado/`: the action seam (today's `lib/acoes/executar.ts`), the Supabase clients and generated database types, Sentry, env, dates and the time zone, the PWA helpers, and the design system (tokens, Radix-based primitives, the shell).

Each module has four layers, and a public surface:

- `dominio`: types, rules, Zod schemas, pure functions. It imports no React, Next or Supabase, so all of it is unit-testable with no setup.
- `aplicacao`: use cases. They validate, call `infra`, apply `dominio` and return a `Resultado`. A use case is what a Server Action calls, so it is `server-only` (ADR 0007 explains why bodies can't live in a `"use server"` file).
- `infra`: Supabase queries and RPC calls, Storage, Realtime, all through the typed client. Row-to-domain mapping happens here and nowhere else.
- `ui`: the module's components and hooks. They reach the server only through Server Actions, never through `infra`.
- `index.ts`: what other modules and `app/` may import. Nothing reaches into another module's folders.

`app/` holds only routes, layouts and the Server Action adapters, which stay two lines: build the client from cookies, call the use case, revalidate (ADR 0007).

**The dependency rule.** `dominio` ← `aplicacao` ← `infra` (adapters implement what `aplicacao` needs), and `ui` → `dominio`. Nothing inward imports outward. `eslint-plugin-boundaries` enforces the rule, so a violation fails lint and CI, instead of relying on review.

**What stays in SQL.** Authorization (RLS, column grants, the security-definer functions), concurrency (row and advisory locks, the lock order, `clock_timestamp()` for the lista de espera), and every invariant that must hold for any client or needs a transaction: the last vaga, the single dono, the cancel freeze, the Sorteio's frozen snapshot. TypeScript holds the algorithms (the Sorteio's balancing), the use-case orchestration, validation for quick feedback, what the UI offers (`capacidades`) and how things are shown. A rule enforced in TypeScript as well is a copy for quick feedback. The database's version is the one that counts.

**Names.** Domain words are Portuguese everywhere, in TypeScript, in SQL and in Storage, with one name per concept (`CONTEXT.md`). That includes the names that are still English today: `players` becomes `jogadores`, `name` becomes `nome`, `image_url` becomes `foto_url`, the bucket `player-images` becomes `fotos-dos-jogadores`, `Player` becomes `Jogador`. Technical words stay English (`use…` hooks, `props`, `schema`, `index.ts`). Files are kebab-case.

**UI.** Primitives are built on Radix UI and styled in the repo, so focus, keyboard and ARIA aren't hand-written. Tailwind moves to version 4, with the tokens declared in CSS.

**How it gets there.** Incrementally: `main` stays deployable after every PR, one module milestone at a time (sorteio first, as the template, then elenco, partida, grupo, sessao). Schema renames go through expand/contract (ADR 0003's method), each rehearsed on staging and approved by the owner before production. The legacy folders shrink as modules move, and are deleted at the end. Until then, a lint allowlist names the UI files that still call Supabase directly, and the list may only shrink.

**Why:** the layers already existed by convention: the seam in `lib/acoes`, pure rules in `lib/*.ts`, the database as the authority. But `lib/` mixed domain, read models, infrastructure and client-only hooks. Nothing stopped a component from calling Supabase, and six did. Some modules held four concerns each (`lib/sessao.ts`, 733 lines), and one concept had up to three names. A folder per context with the layers inside shows where code belongs, and the lint keeps it there.

Rejected:
- **Clean Architecture as in the book**: repository interfaces for every table, a dependency-injection container, a domain that doesn't know the database exists. It would add a layer of indirection over the Supabase client for no second implementation (the integration tests already run the real database). And moving the rules out of SQL into TypeScript would weaken them: the last vaga is safe because counting and inserting happen under one row lock in one transaction, which application code can't reproduce across two round trips.
- **Folders by layer** (`src/dominio/<contexto>`, `src/infra/<contexto>`…): it makes the layers obvious, but spreads each feature over four trees, so a change to the Sorteio touches four distant folders.
- **Keeping `lib/` and `components/`**, only subdivided: less churn, but no boundary a tool can check.
- **Rewriting from scratch** in a new app: it throws away the integration and E2E tests that prove the current behaviour, and ends in a big-bang data migration.
