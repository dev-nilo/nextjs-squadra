# Squadra

Amateur football squad management: a group's roster, its weekly games with presence and a waitlist, and balanced teams drawn on the server.

## Language

A bilingual glossary. The domain terms stay in Portuguese in the code, the UI, the database and Storage, because that's how the people using it talk. Each one gives its English equivalent for readers, and the definitions are in English. Use the Portuguese term in code and docs. The English word is a gloss, not an alias. Each concept has exactly one name; the names under _Avoid_ are not synonyms. Technical words stay English (`use…` hooks, `props`, `schema`), per [ADR 0009](docs/adr/0009-modules-by-context-with-layers.md). [Names still to change](#names-still-to-change) lists where the code doesn't follow this yet.

**Jogador** _(en: player)_:
A player in the Grupo's Elenco, with position, nationality, attributes, overall rating, and an optional photo. It may be linked to the account of the person it represents ("sou esse aqui"): at most one Jogador per account in each Grupo. A Membro links themselves, or adds themselves with default attributes; the `dono`, an `admin` or the person themselves can unlink. Many Jogadores have no account, and that's fine.
_Avoid_: player, Player, athlete

**Carta** _(en: card)_:
How a Jogador is shown: the collectible card with their photo, position, nationality, OVR and attributes. Editing a Jogador means editing their carta, and its version (`versao`) is what makes a stale save fail.
_Avoid_: card, figurinha, player card

**Elenco** _(en: roster)_:
The full set of Jogadores of a Grupo. Every Membro sees it; the `dono` and admins create, edit and delete Jogadores, and a membro can only add themselves.
_Avoid_: Roster (when meaning the whole collection), squad (ambiguous with Time), a per-user Elenco, guest local-only mode

**Grupo** _(en: group)_:
The people who play together and share one Elenco, like a weekly pelada. Named by whoever creates it, who becomes its `dono`. Reached at `/g/<slug>`; the slug is fixed at creation, and gets a random suffix when another Grupo already has it. An account that is already dono of 5 Grupos can't create another; being handed one still works.
_Avoid_: Team (that's a Time), league, club, fut in code. "Fut" is the UI's word for a Grupo and lives only in the text on screen; every identifier says grupo (`sairDoGrupo`, `gereGrupo`).

**Membro** _(en: member)_:
A user's membership in a Grupo, with a papel:
- `dono`: exactly one per Grupo. Everything an admin does, plus the people and the Grupo itself: makes others admin or membro, removes them, renames or deletes the Grupo, and hands it to an admin (becoming an admin). The dono can't leave before handing it over.
- `admin`: organizes: edits Jogadores, runs Partidas and the Sorteio, creates Convites.
- `membro`: answers for their own Jogador and sees the Grupo, except draft Sorteios and other people's emails.

A Membro (capitalized: the membership) is not the papel `membro` (in code font): every dono and admin is also a Membro.

A Membro is known on screen by their linked Jogador's name; only the dono and admins see emails. Leaving, or being removed, unlinks their Jogador, which stays in the Elenco with its presences. A removed person can come back through a Convite that's still valid. Every one of these changes goes through a database function (ADR 0008).
_Avoid_: Pessoa, Participacao, member of the Elenco, player (a Jogador may have no account at all)

**Organizador** _(proposed, en: organizer)_:
A Membro whose papel is `dono` or `admin`, the people who run the fut. It's not a papel, it's the name for those two together, which most rules use ("only an Organizador can…").
_Avoid_: gestor, manager, "quem organiza" as an identifier

**Convite** _(en: invite)_:
A link a Grupo's `dono` or `admin` shares (`/convite/<token>`). Whoever opens it signs in or signs up and joins as `membro`; someone already in the Grupo keeps their papel. Valid for 7 days, and can be cancelled. Cancelling is final and stops new joins; Membros who already joined stay.
_Avoid_: revogar, revoked (the verb is cancelar, as for a Partida), invitation code, magic link (it doesn't sign anyone in)

**Partida** _(en: game)_:
One game of the Grupo: a start (date and time), a place and a number of vagas. The `dono` and admins create, edit and cancel it; every Membro sees it. Cancelling is final: a cancelled Partida keeps its presence list, takes no more answers, and can't be reopened or edited. If the game happens after all, it's a new Partida.
A Partida is in one of three states: **aberta** (before its start, taking answers), **encerrada** (its start has passed: only an Organizador changes the list) or **cancelada**.
_Avoid_: Jogo (ambiguous with the app), match, event

**Presença** _(en: attendance answer, RSVP)_:
A Jogador's answer to a Partida: *vou* or *não vou* (no "talvez"). It belongs to the Jogador, not the account: a Membro answers for the Jogador linked to them, and the `dono` or an admin can answer for any Jogador, including ones with no account. A *vou* is *confirmado* while there are vagas, otherwise it joins the Lista de espera. Once the Partida starts, a Membro can't answer any more; the `dono` and admins still can, to record who really showed up, which is what Frequência counts.
_Avoid_: RSVP (in the UI), check-in

**Lista de espera** _(en: waitlist)_:
The Jogadores who said *vou* after the vagas ran out, in the order the database applied their answers. When a confirmed Jogador drops out, or the vagas go up, the first in line takes the vaga in the same transaction. Saying *não vou* and then *vou* again goes to the end of the line.
_Avoid_: Fila (fine in speech, but the code says espera), reserve list, bench

**Frequência** _(en: attendance rate)_:
How often a Jogador shows up: the share of the Grupo's last 10 Partidas (already started, not cancelled, and since the Jogador joined the Elenco) where they were *confirmado*. The Lista de espera and *não vou* count as absent. Computed by the `frequencia_jogadores` view, which runs under the caller's RLS.
_Avoid_: Attendance (in the UI), presença (that's one answer, not the rate), assiduidade

**Sorteio** _(en: team draw)_:
Distributing Jogadores into Times using attribute-sum balancing (shuffle, rating tiers, assign to the Time with the lowest attribute total). A Partida's Sorteio runs on the server over its confirmed Jogadores only (never the Lista de espera), and is saved on the Partida with a snapshot of each Jogador's rating at draw time (ADR 0004). The `dono` and admins can draw again and move Jogadores between Times until they publish; then every Membro sees the Times, frozen. The Elenco page keeps a quick local Sorteio over any selected Jogadores, with nothing saved.
_Avoid_: Draw (ambiguous), balance API, snake-draft

**Time** _(en: team)_:
A named group of Jogadores produced by a Sorteio, with a computed average rating. Presentation (colors, layout) is not part of a Time.
_Avoid_: team, TeamData, squad

**Mínimo por time** _(en: minimum per team)_:
The floor of Jogadores each Time must have: 2 for a Partida's Sorteio (`MINIMO_POR_TIME`), and set by whoever runs the Elenco's quick Sorteio (default 5). Validates selection before a Sorteio; does not cap how many selected Jogadores are distributed.
_Avoid_: Jogadores por time (as a hard roster size), playersPerTeam (as a slice limit)

**Overall (OVR)** _(en: overall rating)_:
The Jogador's rating: the rounded mean of their attributes (0 to 99 each). The database computes it on every save (trigger `players_ovr`) and ignores whatever a client sends; the screen only previews it. The single source for that number.
_Avoid_: Inline averages at call sites, rating recomputed ad hoc

**Sessão** _(en: session)_:
The authenticated user's signed-in state with Supabase Auth. Email confirmation (PKCE, OTP, expired-link handling) completes a Sessão; UI entry points are adapters over that flow. A password recovery link goes through the same flow and always ends on the page that sets the new password.
_Avoid_: Multiple divergent OTP/error policies per page

## Names still to change

The code doesn't follow the glossary everywhere yet. Each module milestone of the rewrite renames its part (ADR 0009); database and Storage renames go through expand/contract. Remove a row when its rename reaches production.

| Today | Becomes | Where |
|---|---|---|
| table `players`, columns `name`, `position`, `nationality`, `image_url` | `jogadores`, `nome`, `posicao`, `nacionalidade`, `foto_url` | database (elenco) |
| bucket `player-images` | `fotos-dos-jogadores` | Storage (elenco) |
| `Player`, `PlayerPosition`, `Attributes`, `components/player/*`, `uploadPlayerImage`, `calculateOVR` | `Jogador`, `Posicao`, `Atributos`, `elenco/ui`, … | TypeScript (elenco) |
| `image` / `rating` on the TypeScript Jogador | `foto` / `ovr` | TypeScript (elenco) |
| card, figurinha, `CARTA_MUDOU` next to "card" in comments | carta | everywhere |
| `Time.name`, `members`, `avg`; `teams`, `numTeams`, `teamAverage`, `moveMember`; `components/team/*`; `TEAM_COLORS` | `nome`, `jogadores`, `media`; `times`, `numeroDeTimes`, `mediaDoTime`, `moverJogador`; `sorteio/ui` | TypeScript (sorteio) |
| `Pessoa`, `components/pessoas/*`, `Participacao`, `ParticipacaoDesde` | `Membro`, `grupo/ui`, … (the `/pessoas` URL and its title are UI text, like fut, and may stay) | TypeScript (grupo) |
| `sairDoFut`, `removerDoFut`, `renomearFut`, `excluirFut`, `gereFut` | `sairDoGrupo`, `removerDoGrupo`, `renomearGrupo`, `excluirGrupo`, `gereGrupo` | TypeScript (grupo) |
| `organiza`, `gestor` (policy names) | Organizador | TypeScript and SQL (grupo) |
| `convites.revogado_em`, `revogarConvite`, situação `revogado` | `cancelado_em`, `cancelarConvite`, `cancelado` | database and TypeScript (grupo) |
| `players.user_id` (the author) | `criado_por`, like `grupos`, `convites` and `partidas` | database (elenco) |
| `login`, `signup`, `logout`, `changePassword` | `entrar`, `criarConta`, `sair`, `trocarSenha` | TypeScript (sessao) |
