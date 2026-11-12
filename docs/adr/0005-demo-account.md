# The demo is one shared account, guarded in the database

"Entrar como demo" signs every visitor into the same account, `demo@example.com`, the dono of its own Grupo (`/g/demo`). It's a real account under the same RLS as everyone else, so a visitor sees the actual product: confirming presence, the Lista de espera, drawing and publishing Times, the Frequência. Rejected: a read-only demo (it would show screens, not the product) and one throwaway account per visitor (sign-ups to clean up, and an empty Grupo to start from).

Sharing means one visitor's actions reach the next, so the demo is fenced in by the database, not by the UI:

- **It stays in its Grupo, and nobody joins it.** A trigger on `grupo_membros` refuses any row that would put the demo account in another Grupo or anyone else in the demo's. That one check covers `criar_grupo`, `aceitar_convite` and anything added later. Invite links to the demo Grupo are refused too.
- **It can't delete the Grupo** (a restrictive policy) **or upload photos.** Storage files would outlive the reset, in a public bucket.
- **It has no password and keeps its email.** The server signs it in by generating a one-time link with the service role and using it right away (`app/actions/demo.ts`), so there's no shared secret to leak. A trigger on `auth.users` refuses any change to its email, phone or password, whatever the Auth API is asked.

Every night, Vercel Cron calls `/api/cron/resetar-demo` with `CRON_SECRET`, and the route calls `resetar_demo()`. That function is executable only by the service role. It deletes everything in the demo Grupo and rebuilds it: an Elenco of 16, four past Partidas with published Times, and an open Partida three days ahead, half answered. Partida ids are fixed, so the open one is always `…0100`.

The ids are the same in every environment. The migration creates the Grupo, which also reserves the `demo` slug. Locally and on staging, the seed creates the account. In production, the app creates it with the admin API the first time someone asks for the demo, then runs the reset. That keeps a hand-written `auth.users` insert out of the production migrations.

Cost: the app needs `SUPABASE_SERVICE_ROLE_KEY` on the server, and only `lib/supabase/admin.ts` reads it. That module is `server-only`. During the day, a visitor can still edit the demo's Elenco or rename its Grupo, and the next visitor sees that until the reset.
