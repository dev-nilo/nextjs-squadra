# Squadra

Amateur football squad management: build a roster of players and draw balanced teams for matches.

## Language

**Jogador**:
A player card with position, nationality, attributes, overall rating, and optional image.
_Avoid_: Card (UI only), athlete

**Elenco**:
The authenticated user's full set of Jogadores. Unauthenticated / guest collections are out of scope.
_Avoid_: Roster (when meaning the whole collection), squad (ambiguous with Time), guest local-only mode

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
