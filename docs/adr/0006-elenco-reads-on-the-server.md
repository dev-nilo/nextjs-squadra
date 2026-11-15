# The Elenco is read on the server and written through Server Actions, with no local copy

Supersedes [ADR 0002](0002-elenco-one-deep-module.md).

`/g/<slug>` is a Server Component. It reads the Grupo, its Jogadores and the user's other Grupos with the user's session, so RLS decides what comes back, the same way the Partidas pages work. Creating, editing, deleting and importing Jogadores are Server Actions (`app/actions/jogador.ts`, adapters over `lib/acoes/jogador.ts`, ADR 0007). They validate with Zod (`jogadorSchema`) and revalidate the page, which brings the new list back; the database computes the rating (trigger `players_ovr`, ADR 0004). The browser keeps only view state: search, sort, selection and the quick draw.

The browser no longer keeps a copy of the Elenco in localStorage, and there's no "sync" button; the only offline mode is the read-only saved pages (update below). That copy served the app when it ran in the browser only. Once Jogadores belonged to a Grupo with roles, it went stale: another admin's edits, a Jogador linked to an account, or a role change only reached a browser on its next sync. It also left player names behind in a shared browser. The app now clears those old keys on load.

Photos still go from the browser straight to Storage, under the Grupo's folder, where the Storage policies only let the dono and admins write. The action only saves a photo URL in that folder of this project's bucket, or the one the Jogador already had. When a Jogador is deleted, or their photo leaves the card (removed, or replaced by a file at another path), the action deletes their own file, `<grupo_id>/<jogador_id>.<ext>`, once the row has changed. That's best effort: a leftover file costs storage, not correctness.

The last Grupo opened is a cookie, `squadra-futs`, set by `proxy.ts` (most recent first, up to five slugs), so `/` can redirect on the server. It isn't trusted: `/` opens the first of those Grupos the user is still a Membro of, else the default.

Rejected: keeping the cache as a fast first paint. The server render is already the first paint, and two sources of truth for the Elenco is the bug this removes.

**Update (2026-11-13):** the installed app (#69, `public/sw.js`) saves each fut's home and Elenco pages in Cache Storage and shows them read-only with no signal. That's a saved render, not a second source of truth: pages always try the network first, every write is off offline, and signing out deletes the saved pages.
