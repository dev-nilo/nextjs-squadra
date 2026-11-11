# Elenco belongs to a Grupo, not to a user

Jogadores move from `players.user_id` to `players.grupo_id`. A user reaches an Elenco by being a Membro of its Grupo, as `dono`, `admin` or `membro`, and Postgres RLS enforces those roles. Sharing one Elenco across the people who play together is the point of the multi-user v1, and keeping the Elenco per user would have turned every shared read into a cross-owner permission check. Rejected: a Grupo that only references Jogadores owned by several users.

There's no auto-named Grupo. A user with no Grupo names theirs on first access, and `criar_grupo` moves their existing Jogadores into it, so the backfill happens one user at a time. The schema change is expand/contract in five steps, each its own migration and PR, so every deploy stays compatible with the one before. Jogadores of users who never came back stayed without a Grupo. The plan was to delete them right before `grupo_id` became `NOT NULL`, but production had one such account with 37 Jogadores, a real person. So the enforce step adopts them instead, into a new "Meu fut" Grupo with their author as dono. Deleting someone's Elenco can't be undone, and an unused Grupo can be.

Grupos and Membros are only created through security-definer functions, never by direct insert. A Grupo's slug is fixed at creation, so renaming keeps its links.
