# The Elenco is read on the server and written through Server Actions, with no local copy

Supersedes [ADR 0002](0002-elenco-one-deep-module.md).

`/g/<slug>` is a Server Component. It reads the Grupo, its Jogadores and the user's other Grupos with the user's session, so RLS decides what comes back, the same way the Partidas pages work. Creating, editing, deleting and importing Jogadores are Server Actions (`app/actions/jogador.ts`). They validate with Zod (`jogadorSchema`), compute the rating from the attributes and revalidate the page, which brings the new list back. The browser keeps only view state: search, sort, selection and the quick draw.

The browser no longer keeps a copy of the Elenco in localStorage, and there's no offline mode or "sync" button. That copy served the app when it ran in the browser only. Once Jogadores belonged to a Grupo with roles, it went stale: another admin's edits, a Jogador linked to an account, or a role change only reached a browser on its next sync. It also left player names behind in a shared browser. The app now clears those old keys on load.

Photos still go from the browser straight to Storage, under the Grupo's folder, where the Storage policies only let the dono and admins write. The action only saves a photo URL in that folder of this project's bucket, or the one the Jogador already had.

The last Grupo opened is a cookie, `squadra-futs`, set by `proxy.ts` (most recent first, up to five slugs), so `/` can redirect on the server. It isn't trusted: `/` opens the first of those Grupos the user is still a Membro of, else the default.

Rejected: keeping the cache as a fast first paint. The server render is already the first paint, and two sources of truth for the Elenco is the bug this removes.
