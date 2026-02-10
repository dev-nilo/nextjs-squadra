-- Create players table
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  image_url text,
  position text not null,
  ovr integer not null default 60,
  velocidade integer not null default 60,
  resistencia integer not null default 60,
  chute integer not null default 60,
  posicionamento integer not null default 60,
  defesa integer not null default 60,
  drible integer not null default 60,
  passe integer not null default 60,
  fisico integer not null default 60,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.players enable row level security;

-- Create RLS policies
create policy "Allow users to view their own players" on public.players
  for select using (auth.uid() = user_id);

create policy "Allow users to insert their own players" on public.players
  for insert with check (auth.uid() = user_id);

create policy "Allow users to update their own players" on public.players
  for update using (auth.uid() = user_id);

create policy "Allow users to delete their own players" on public.players
  for delete using (auth.uid() = user_id);

-- Create index for better query performance
create index players_user_id_idx on public.players(user_id);
