-- Create teams table
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  player_ids uuid[] not null default '{}',
  average_rating decimal(5, 2) not null default 60,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.teams enable row level security;

-- Create RLS policies
create policy "Allow users to view their own teams" on public.teams
  for select using (auth.uid() = user_id);

create policy "Allow users to insert their own teams" on public.teams
  for insert with check (auth.uid() = user_id);

create policy "Allow users to update their own teams" on public.teams
  for update using (auth.uid() = user_id);

create policy "Allow users to delete their own teams" on public.teams
  for delete using (auth.uid() = user_id);

-- Create index for better query performance
create index teams_user_id_idx on public.teams(user_id);
