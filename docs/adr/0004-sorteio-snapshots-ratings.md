# Sorteio results snapshot Jogador ratings

A Partida's Sorteio is saved on the Partida (`sorteios.times`) as a copy of each Jogador at draw time: name, position, OVR and attributes. It doesn't reference `players`. Editing a Jogador later (a better OVR after a good season, a new name) doesn't change past Times, so a Partida's history stays the way it was played. Rejected: storing only Jogador ids and joining `players` on read, which rewrites history whenever someone is edited.

The draw runs on the server. The browser sends a Partida id and a number of Times; the Server Action reads the confirmed Jogadores from the database and runs `lib/sorteio.ts`. The snapshot itself is built inside `salvar_sorteio()` from `players`, so no client, not even an admin's, can save a made-up rating. The function only accepts an assignment of exactly the confirmed Jogadores, so the Lista de espera never plays. It runs under the Partida's row lock, the same one `responder_presenca()` takes.

Adjusting a draft moves the snapshots already taken, so a move never refreshes ratings. Publishing freezes the Times and makes them visible to every Membro. Both are refused if the confirmed list no longer matches the draw: the draw has to be redone, so nobody who dropped out ends up in a published Time.

**Update (2026-11-12):** "no client can save a made-up rating" holds because the database computes the rating. The trigger `players_ovr` sets `players.ovr` to the rounded mean of the 8 attributes on every insert and update, whatever the client sends, and a check keeps the attributes between 0 and 99. Before that, `ovr` was computed only in TypeScript, and a dono or admin could PATCH it through the API.
