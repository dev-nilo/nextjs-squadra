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

**Sorteio**:
Distributing the selected Jogadores into Times using attribute-sum balancing (shuffle, rating tiers, assign to the Time with the lowest attribute total).
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

**Sessão**:
The authenticated user's signed-in state with Supabase Auth. Email confirmation (PKCE, OTP, expired-link handling) completes a Sessão; UI entry points are adapters over that flow.
_Avoid_: Multiple divergent OTP/error policies per page
