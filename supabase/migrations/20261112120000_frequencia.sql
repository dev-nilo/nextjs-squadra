-- Frequência: how often each Jogador shows up, for the history screen.
--
-- Over the Grupo's last 10 Partidas that already started and weren't
-- cancelled, the share where the Jogador was confirmado. The lista de espera
-- and não vou count as absent. Only Partidas since the Jogador joined the
-- Elenco count, so someone who arrived two weeks ago and came to both games is
-- at 100%, not 20%.
--
-- security_invoker: the view runs with the caller's rights, so the RLS on
-- players, partidas and presencas applies. A Membro sees their Grupo's
-- Jogadores; anyone else sees nothing.
create view public.frequencia_jogadores
with (security_invoker = true)
as
with ultimas as (
  select
    p.id,
    p.grupo_id,
    p.inicio,
    row_number() over (partition by p.grupo_id order by p.inicio desc) as ordem
  from public.partidas p
  where p.cancelada_em is null and p.inicio <= now()
)
select
  j.grupo_id,
  j.id as jogador_id,
  count(u.id)::int as partidas,
  count(c.jogador_id)::int as presencas,
  case
    when count(u.id) = 0 then null
    else round(100.0 * count(c.jogador_id) / count(u.id))::int
  end as frequencia
from public.players j
left join ultimas u
  on u.grupo_id = j.grupo_id and u.ordem <= 10 and u.inicio >= j.created_at
left join public.presencas c
  on c.partida_id = u.id and c.jogador_id = j.id and c.situacao = 'confirmado'
group by j.grupo_id, j.id;

revoke all on public.frequencia_jogadores from anon, authenticated;
grant select on public.frequencia_jogadores to authenticated;
