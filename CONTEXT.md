# Squadra

Amateur football squad management: build a roster of players and draw balanced teams for matches.

## Language

**Jogador**:
A player card with position, nationality, attributes, overall rating, and optional image. It may be linked to the account of the person it represents ("sou esse aqui"): at most one Jogador per account in each Grupo. A Membro links themselves, or adds themselves with default attributes; the `dono` or an `admin` can unlink. Many Jogadores have no account, and that's fine.
_Avoid_: Card (UI only), athlete

**Elenco**:
The full set of Jogadores of a Grupo. Every Membro sees it; only `dono` and `admin` change it.
_Avoid_: Roster (when meaning the whole collection), squad (ambiguous with Time), a per-user Elenco, guest local-only mode

**Grupo**:
The people who play together and share one Elenco, like a weekly pelada. Named by whoever creates it, who becomes its `dono`. Reached at `/g/<slug>`; the slug is fixed at creation.
_Avoid_: Team (that's a Time), league, club, "fut" in code (it's only the UI word on the naming screen)

**Membro**:
A user's membership in a Grupo, with a papel: `dono` (exactly one per Grupo; renames or deletes it, promotes admins), `admin` (edits Jogadores, and later runs Partidas and the Sorteio), or `membro` (sees the Elenco).
_Avoid_: Member of the Elenco, player (a Jogador may have no account at all)

**Convite**:
A link a Grupo's `dono` or `admin` shares (`/convite/<token>`). Whoever opens it signs in or signs up and joins as `membro`; someone already in the Grupo keeps their papel. Valid for 7 days, and can be cancelled. Cancelling stops new joins; Membros who already joined stay.
_Avoid_: Invitation code, magic link (it doesn't sign anyone in)

**Partida**:
One game of the Grupo: a start (date and time), a place and a number of vagas. The `dono` and admins create, edit and cancel it; every Membro sees it. A cancelled Partida keeps its presence list but takes no more answers.
_Avoid_: Jogo (ambiguous with the app), match, event

**Presença**:
A Jogador's answer to a Partida: *vou* or *não vou* (no "talvez"). It belongs to the Jogador, not the account: a Membro answers for the Jogador linked to them, and the `dono` or an admin can answer for any Jogador, including ones with no account. A *vou* is *confirmado* while there are vagas, otherwise it joins the Lista de espera.
_Avoid_: RSVP (in the UI), check-in

**Lista de espera**:
The Jogadores who said *vou* after the vagas ran out, in the order they asked. When a confirmed Jogador drops out, or the vagas go up, the first in line takes the vaga in the same transaction. Saying *não vou* and then *vou* again goes to the end of the line.
_Avoid_: Fila (fine in speech, but the code says espera), reserve list, bench

**Frequência**:
How often a Jogador shows up: the share of the Grupo's last 10 Partidas (already started, not cancelled, and since the Jogador joined the Elenco) where they were *confirmado*. The Lista de espera and *não vou* count as absent. Computed by the `frequencia_jogadores` view, which runs under the caller's RLS.
_Avoid_: Attendance (in the UI), presença (that's one answer, not the rate), assiduidade

**Sorteio**:
Distributing Jogadores into Times using attribute-sum balancing (shuffle, rating tiers, assign to the Time with the lowest attribute total). A Partida's Sorteio runs on the server over its confirmed Jogadores only (never the Lista de espera), and is saved on the Partida with a snapshot of each Jogador's rating at draw time (ADR 0004). The `dono` and admins can draw again and move Jogadores between Times until they publish; then every Membro sees the Times, frozen. The Elenco page keeps a quick local Sorteio over any selected Jogadores, with nothing saved.
_Avoid_: Draw (ambiguous), balance API, snake-draft

**Time**:
A named group of Jogadores produced by a Sorteio, with a computed average rating. Presentation (colors, layout) is not part of a Time.
_Avoid_: TeamData, squad

**Mínimo por time**:
The configured floor of Jogadores each Time should have. Validates selection before a Sorteio; does not cap how many selected Jogadores are distributed.
_Avoid_: Jogadores por time (as a hard roster size), playersPerTeam (as a slice limit)

**Overall (OVR)**:
The Jogador's rating: the rounded mean of their attributes. The single source for that number.
_Avoid_: Inline averages at call sites, rating recomputed ad hoc

**Demo**:
The shared account behind "Entrar como demo" and its Grupo, `/g/demo`. Anyone can use it, and it's put back every night by `resetar_demo()`. It's a regular dono, but it stays in its own Grupo, nobody else joins it, and it has no password (ADR 0005).
_Avoid_: Guest mode, sandbox, test account

**Sessão**:
The authenticated user's signed-in state with Supabase Auth. Email confirmation (PKCE, OTP, expired-link handling) completes a Sessão; UI entry points are adapters over that flow.
_Avoid_: Multiple divergent OTP/error policies per page
