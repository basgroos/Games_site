-- Bas Games: wereldranglijst
-- Plak dit in Supabase: SQL Editor -> New query -> Run.
-- Eén tabel voor alle spellen (kolom "game") en voor live en staging (kolom "env").

create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  env         text    not null default 'live' check (env in ('live', 'staging')),
  game        text    not null check (game ~ '^[a-z0-9-]{2,32}$'),
  player_id   uuid    not null,
  name        text    not null check (char_length(name) between 2 and 16),
  mode        text    not null check (mode ~ '^[a-z]{2,16}$'),
  map         text    check (char_length(map) <= 32),
  diff        smallint check (diff between 0 and 20),
  score       integer not null check (score between 0 and 5000000),
  waves       integer check (waves between 0 and 10000),
  kills       integer check (kills between 0 and 1000000),
  win         boolean,
  version     text    check (char_length(version) <= 16)
);

create index if not exists scores_board_idx on public.scores (env, game, mode, score desc);
create index if not exists scores_player_idx on public.scores (player_id);

-- Beveiliging: iedereen mag scores lezen en toevoegen, niemand mag ze wijzigen of verwijderen.
alter table public.scores enable row level security;
drop policy if exists "scores lezen" on public.scores;
create policy "scores lezen" on public.scores for select to anon, authenticated using (true);
drop policy if exists "scores toevoegen" on public.scores;
create policy "scores toevoegen" on public.scores for insert to anon, authenticated with check (true);
grant select, insert on public.scores to anon, authenticated;

-- Ranglijst per modus: de beste score per speler, met plek.
create or replace view public.leaderboard with (security_invoker = true) as
select rank() over (partition by env, game, mode order by score desc) as rank, *
from (
  select distinct on (env, game, mode, player_id)
         env, game, mode, player_id, name, score, map, diff, waves, created_at
  from public.scores
  order by env, game, mode, player_id, score desc, created_at asc
) best;

-- Ranglijst over alle modi samen: de allerbeste score per speler.
create or replace view public.leaderboard_total with (security_invoker = true) as
select rank() over (partition by env, game order by score desc) as rank, *
from (
  select distinct on (env, game, player_id)
         env, game, mode, player_id, name, score, map, diff, waves, created_at
  from public.scores
  order by env, game, player_id, score desc, created_at asc
) best;

grant select on public.leaderboard, public.leaderboard_total to anon, authenticated;
