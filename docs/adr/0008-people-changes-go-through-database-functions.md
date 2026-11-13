# People and Grupo changes go through database functions

Changing someone's papel, removing them, leaving, handing the Grupo over, renaming it and deleting it each go through one `security definer` function (`mudar_papel`, `remover_do_grupo`, `sair_do_grupo`, `passar_posse`, `renomear_grupo`, `excluir_grupo`, in `20261114000000_pessoas.sql`). The rules live inside them, and they explain a refusal with a HINT the app's error table translates (ADR 0007). The direct writes are closed: no `update`/`delete` policies on `grupo_membros` or `grupos`, and no column grant on `papel`. Reading who's in the Grupo goes through `pessoas_do_grupo`, which joins the linked Jogador's name and returns emails only to the dono and admins.

**Why:** before this, RLS policies held the rules, and some rules can't be policies:
- "Never zero or two donos": handing over is two updates that must happen together, under a lock.
- "Leaving unlinks your Jogador": a delete on one table and an update on another.
- "Type the name to delete": an input that isn't a column.

A policy also says only "no rows", where a function can say why. And with the rules spread over policies, nothing tied them to what the screens show.

**How it stays honest:** `tests/integration/pessoas.test.ts` runs every action against every papel and checks that the database accepts exactly what `capacidades()` (`lib/capacidades.ts`) tells the screens to show. A new rule changes the function, `capacidades()` and that matrix together.

Rejected:
- Keeping the policies and adding functions only for handing over and deleting. That leaves two ways to change a papel, with rules in two places.
- Per-person permissions instead of three papéis. A pelada has one or two organizers. A grid of switches would be harder to understand than three papéis, each described in one line.
