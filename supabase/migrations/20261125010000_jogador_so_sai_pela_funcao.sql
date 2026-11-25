-- Contract step of 20261125000000_ordem_ao_excluir_e_vincular.sql (#108).
--
-- The app deletes Jogadores through excluir_jogador, which takes the Jogador's
-- Partidas before the Jogador. A DELETE sent straight to the API took them the
-- other way round and could still deadlock with someone answering for that
-- Jogador, so the privilege and its policy go. The service role, which the
-- app never uses for this, keeps its own.

revoke delete on table public.players from authenticated;
drop policy "players_delete_gestor" on public.players;
