-- Deterministic seed for local dev, CI and staging. Fake data only:
-- never copy production rows here.
--
-- Users (password for all: squadra-dev-123)
--   dev@squadra.test     dono of "Fut do Dev", the main Elenco (20 Jogadores)
--   amigo@squadra.test   dono of "Fut do Amigo", a small Elenco (3 Jogadores), to
--                        check one Grupo never sees another's
--   novato@squadra.test  no Grupo and no Jogadores yet: signing in shows the
--                        "Dê um nome pro seu fut" screen

-- ---------------------------------------------------------------------------
-- Auth users, already confirmed
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111',
   'authenticated', 'authenticated', 'dev@squadra.test',
   extensions.crypt('squadra-dev-123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222',
   'authenticated', 'authenticated', 'amigo@squadra.test',
   extensions.crypt('squadra-dev-123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333',
   'authenticated', 'authenticated', 'novato@squadra.test',
   extensions.crypt('squadra-dev-123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
values
  ('11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
   '11111111-1111-4111-8111-111111111111',
   '{"sub":"11111111-1111-4111-8111-111111111111","email":"dev@squadra.test","email_verified":true}',
   'email', now(), now(), now()),
  ('22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222',
   '22222222-2222-4222-8222-222222222222',
   '{"sub":"22222222-2222-4222-8222-222222222222","email":"amigo@squadra.test","email_verified":true}',
   'email', now(), now(), now()),
  ('33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333',
   '33333333-3333-4333-8333-333333333333',
   '{"sub":"33333333-3333-4333-8333-333333333333","email":"novato@squadra.test","email_verified":true}',
   'email', now(), now(), now());

-- ---------------------------------------------------------------------------
-- Grupos. novato has none yet (first-access screen).
-- ---------------------------------------------------------------------------
insert into public.grupos (id, slug, nome, criado_por)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'fut-do-dev', 'Fut do Dev', '11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'fut-do-amigo', 'Fut do Amigo', '22222222-2222-4222-8222-222222222222');

insert into public.grupo_membros (grupo_id, user_id, papel)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'dono'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'dono');

-- ---------------------------------------------------------------------------
-- Jogadores. OVR = rounded mean of the 8 attributes, same rule as lib/jogador.ts
-- ---------------------------------------------------------------------------
insert into public.players (
  user_id, grupo_id, name, position, nationality, ovr,
  velocidade, resistencia, chute, posicionamento, defesa, drible, passe, fisico
)
select
  v.user_id::uuid,
  case v.user_id
    when '11111111-1111-4111-8111-111111111111' then 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
    when '22222222-2222-4222-8222-222222222222' then 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
  end,
  v.name, v.position, v.nationality,
  round((v.vel + v.res + v.chu + v.pos + v.def + v.dri + v.pas + v.fis) / 8.0),
  v.vel, v.res, v.chu, v.pos, v.def, v.dri, v.pas, v.fis
from (values
  -- dev@squadra.test
  ('11111111-1111-4111-8111-111111111111', 'Paredão',     'GOL', 'BR', 45, 70, 40, 85, 80, 35, 60, 78),
  ('11111111-1111-4111-8111-111111111111', 'Luva',        'GOL', 'BR', 50, 65, 45, 78, 72, 40, 58, 70),
  ('11111111-1111-4111-8111-111111111111', 'Zagueirão',   'FIX', 'BR', 55, 75, 50, 80, 88, 45, 65, 85),
  ('11111111-1111-4111-8111-111111111111', 'Xerife',      'FIX', 'BR', 60, 80, 55, 78, 84, 50, 70, 82),
  ('11111111-1111-4111-8111-111111111111', 'Muralha',     'FIX', 'PT', 52, 72, 48, 75, 80, 42, 62, 88),
  ('11111111-1111-4111-8111-111111111111', 'Tranca',      'FIX', 'BR', 58, 70, 52, 72, 78, 48, 66, 76),
  ('11111111-1111-4111-8111-111111111111', 'Foguete',     'ALA', 'BR', 92, 85, 70, 70, 55, 82, 74, 68),
  ('11111111-1111-4111-8111-111111111111', 'Motorzinho',  'ALA', 'BR', 84, 92, 65, 74, 62, 76, 78, 70),
  ('11111111-1111-4111-8111-111111111111', 'Corisco',     'ALA', 'AR', 88, 78, 72, 68, 50, 86, 72, 62),
  ('11111111-1111-4111-8111-111111111111', 'Maestro',     'ALA', 'BR', 70, 74, 76, 82, 60, 84, 92, 64),
  ('11111111-1111-4111-8111-111111111111', 'Pé de Pano',  'ALA', 'BR', 66, 70, 60, 64, 58, 70, 74, 60),
  ('11111111-1111-4111-8111-111111111111', 'Canhota',     'ALA', 'UY', 74, 72, 84, 70, 55, 80, 82, 66),
  ('11111111-1111-4111-8111-111111111111', 'Matador',     'ATA', 'BR', 82, 70, 92, 84, 40, 85, 70, 78),
  ('11111111-1111-4111-8111-111111111111', 'Artilheiro',  'ATA', 'BR', 80, 72, 88, 82, 45, 80, 68, 80),
  ('11111111-1111-4111-8111-111111111111', 'Pivô',        'ATA', 'BR', 62, 76, 80, 78, 52, 66, 72, 90),
  ('11111111-1111-4111-8111-111111111111', 'Fominha',     'ATA', 'BR', 78, 68, 74, 60, 38, 82, 50, 64),
  ('11111111-1111-4111-8111-111111111111', 'Chuta-Bem',   'ATA', 'IT', 70, 66, 90, 76, 42, 72, 66, 74),
  ('11111111-1111-4111-8111-111111111111', 'Bagre',       'FIX', 'BR', 40, 55, 35, 50, 55, 30, 45, 60),
  ('11111111-1111-4111-8111-111111111111', 'Perna de Pau','ALA', 'BR', 50, 60, 40, 45, 45, 38, 48, 55),
  ('11111111-1111-4111-8111-111111111111', 'Café com Leite','ATA','BR', 45, 50, 50, 42, 35, 44, 46, 50),
  -- amigo@squadra.test
  ('22222222-2222-4222-8222-222222222222', 'Goleiro do Amigo', 'GOL', 'BR', 50, 60, 40, 72, 70, 40, 55, 68),
  ('22222222-2222-4222-8222-222222222222', 'Ala do Amigo',     'ALA', 'BR', 80, 75, 65, 66, 55, 74, 70, 62),
  ('22222222-2222-4222-8222-222222222222', 'Pivô do Amigo',    'ATA', 'BR', 64, 70, 78, 74, 48, 64, 66, 82)
) as v(user_id, name, position, nationality, vel, res, chu, pos, def, dri, pas, fis);
