-- ---------------------------------------------------------------------------
-- The Overall is computed by the database: the rounded mean of the 8
-- attributes, on every insert and update, whatever the client sent.
--
-- It used to be computed only in TypeScript, and `ovr` was a column any dono
-- or admin could PATCH through the API. The next Sorteio snapshotted that
-- number, so ADR 0004's "no client can save a made-up rating" didn't hold.
--
-- A trigger rather than a generated column: the app deployed before this
-- migration still sends `ovr` on every save, and a generated column would
-- refuse those writes until the new app is live. The trigger just overwrites
-- the value.
--
-- Attributes go from 0 to 99, as jogadorSchema already says; now the table
-- says so too.
-- ---------------------------------------------------------------------------

create function public.calcular_ovr()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.ovr := round(
    (new.velocidade + new.resistencia + new.chute + new.posicionamento
      + new.defesa + new.drible + new.passe + new.fisico) / 8.0
  );
  return new;
end;
$$;

create trigger players_ovr
  before insert or update on public.players
  for each row execute function public.calcular_ovr();

-- Rows from before: attributes outside 0..99 are brought into range, then
-- every rating that isn't the mean of its attributes is recomputed (the
-- trigger does it on the update). Past Sorteios keep their snapshots.
do $$
declare
  ajustados int;
  recalculados int;
begin
  update public.players
  set velocidade = least(greatest(velocidade, 0), 99),
      resistencia = least(greatest(resistencia, 0), 99),
      chute = least(greatest(chute, 0), 99),
      posicionamento = least(greatest(posicionamento, 0), 99),
      defesa = least(greatest(defesa, 0), 99),
      drible = least(greatest(drible, 0), 99),
      passe = least(greatest(passe, 0), 99),
      fisico = least(greatest(fisico, 0), 99)
  where not (
    velocidade between 0 and 99 and resistencia between 0 and 99 and chute between 0 and 99
    and posicionamento between 0 and 99 and defesa between 0 and 99 and drible between 0 and 99
    and passe between 0 and 99 and fisico between 0 and 99
  );
  get diagnostics ajustados = row_count;

  update public.players
  set ovr = ovr
  where ovr is distinct from round(
    (velocidade + resistencia + chute + posicionamento + defesa + drible + passe + fisico) / 8.0
  );
  get diagnostics recalculados = row_count;

  raise notice 'players: % with attributes brought into 0..99, % ratings recomputed', ajustados, recalculados;
end;
$$;

alter table public.players
  add constraint players_atributos_0_a_99 check (
    velocidade between 0 and 99 and resistencia between 0 and 99 and chute between 0 and 99
    and posicionamento between 0 and 99 and defesa between 0 and 99 and drible between 0 and 99
    and passe between 0 and 99 and fisico between 0 and 99
  );
