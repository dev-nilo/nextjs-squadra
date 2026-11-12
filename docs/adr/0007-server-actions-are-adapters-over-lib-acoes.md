# Server Actions are thin adapters over lib/acoes

Every Server Action in `app/actions/` does two things: it builds the Supabase client from the request's cookies, and it calls the matching function in `lib/acoes/`. After a successful write in a Grupo, it revalidates `/g/<slug>` as a layout, so every page of that Grupo renders again. The logic lives in `lib/acoes/`, behind one seam, `lib/acoes/executar.ts`:

- `noGrupo(supabase, slug, opcoes, corpo)` validates the slug and resolves the Grupo with the user's session (`resolverGrupo`, the same lookup the `/g` pages use). A Grupo action takes the slug, never a Grupo id from the browser, and its table writes filter on that Grupo's id. RLS and the database functions still decide whether the papel allows the write. The seam doesn't check papéis in TypeScript.
- `comSessao(supabase, opcoes, corpo)` covers the two actions that run before there's a Grupo: creating one, and accepting a Convite.
- Inside a body, a refusal is thrown (`recusar`, `validar`, `exigir`, `exigirLinhas`). The seam catches it and runs one error table for every action:
  - Postgres codes `28000` and `PGRST301` mean the Sessão expired.
  - A HINT or Postgres code the action lists in its `motivos` gets that motivo's message.
  - `42501`, a `sem-permissao` HINT, or an update that matched no rows gets "Só quem organiza o fut pode fazer isso."
  - Anything else goes to Sentry, tagged with the action, and gets the action's generic message.
- Callers always get a `Resultado<T>`; nothing thrown crosses the seam.

The bodies can't live in `app/actions/`. Every export of a `"use server"` file is a public endpoint, so a function there that took a `{ supabase, grupo }` context could be called from the browser with a forged one. `lib/acoes/` is `server-only`.

There are two adapters at the seam. In production, `createClient()` builds the client from cookies. In the integration tests, `newUser().client` is a signed-in client against the local Supabase. So `tests/integration/acoes.test.ts` exercises the error table against the real RLS and database functions, and `lib/acoes/executar.test.ts` covers the table itself with a fake client.

**Why:** before this, the six action files each had their own copy of the Sessão check, the error mapping and the result type. The copies had already drifted. An expired JWT was "Sua sessão expirou" in three files and a generic error plus a Sentry event in the others. Some actions validated the slug and others didn't. The browser sent both the slug and the Grupo id, and no test called an action.

A new action goes in `lib/acoes/<feature>.ts` through `noGrupo` or `comSessao`, with a two-line adapter in `app/actions/`. Rejected: a shared `falha()` helper imported by each action file. That would remove the copies, but each file would still resolve the Sessão and the Grupo its own way, and the actions would stay untestable.
