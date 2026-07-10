-- Optional: add nationality if the table was created from 01_create_players_table.sql
alter table public.players
    add column if not exists nationality text default 'BR';
