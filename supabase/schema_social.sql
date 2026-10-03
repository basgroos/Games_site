-- Bas Games: spelers, vrienden en uitnodigingen
-- Staat al in het Supabase-project 'bas-games'. Alleen nodig voor een nieuw project:
-- SQL Editor -> New query -> Run (na schema.sql).
-- Alle schrijfacties lopen via functies die het geheime spelers-token controleren.
-- Niemand kan dus andermans vriendschappen of uitnodigingen aanpassen.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.players (
  id          uuid primary key,
  code        text unique not null,
  name        text not null check (char_length(name) between 2 and 16),
  secret_hash text not null,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);
alter table public.players enable row level security;
revoke all on public.players from anon, authenticated;

-- Vriendschappen: rijen worden nooit verwijderd, alleen van status gewisseld.
create table if not exists public.friend_links (
  a          uuid not null references public.players(id) on delete cascade,  -- verzoeker
  b          uuid not null references public.players(id) on delete cascade,  -- ontvanger
  status     text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'removed')),
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a <> b)
);
create index if not exists friend_links_b_idx on public.friend_links (b);
alter table public.friend_links enable row level security;
revoke all on public.friend_links from anon, authenticated;

create table if not exists public.invites (
  id         uuid primary key default gen_random_uuid(),
  from_id    uuid not null references public.players(id) on delete cascade,
  to_id      uuid not null references public.players(id) on delete cascade,
  kind       text not null check (kind in ('race', 'coop')),
  game       text not null default 'heldenwacht' check (game ~ '^[a-z0-9-]{2,32}$'),
  env        text not null default 'live' check (env in ('live', 'staging')),
  map        text not null check (char_length(map) <= 32),
  diff       smallint not null check (diff between 0 and 20),
  seed       integer not null default floor(random() * 1000000000)::int,
  status     text not null default 'open' check (status in ('open', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists invites_to_idx on public.invites (to_id, status, created_at desc);
alter table public.invites enable row level security;
revoke all on public.invites from anon, authenticated;

-- ---------- hulpfuncties ----------
create or replace function public._hw_auth(p_id uuid, p_secret text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.players where id = p_id and secret_hash = encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex'));
$$;
revoke all on function public._hw_auth(uuid, text) from public, anon, authenticated;

create or replace function public._hw_check(p_id uuid, p_secret text) returns void
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public._hw_auth(p_id, p_secret) then raise exception 'auth' using errcode = '28000'; end if;
end $$;
revoke all on function public._hw_check(uuid, text) from public, anon, authenticated;

-- ---------- registreren (bij het invoeren van je naam) ----------
create or replace function public.register_player(p_id uuid, p_secret text, p_name text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_row public.players;
  v_code text;
  v_alpha text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i int;
begin
  if char_length(coalesce(p_secret, '')) < 24 then raise exception 'secret'; end if;
  select * into v_row from public.players where id = p_id;
  if found then
    if v_row.secret_hash <> encode(extensions.digest(p_secret, 'sha256'), 'hex') then raise exception 'auth' using errcode = '28000'; end if;
    update public.players set name = p_name, last_seen = now() where id = p_id;
    return json_build_object('code', v_row.code);
  end if;
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alpha, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % char_length(v_alpha)), 1);
    end loop;
    exit when not exists (select 1 from public.players where code = v_code);
  end loop;
  insert into public.players (id, code, name, secret_hash) values (p_id, v_code, p_name, encode(extensions.digest(p_secret, 'sha256'), 'hex'));
  return json_build_object('code', v_code);
end $$;

-- ---------- alles over mij in één keer ----------
create or replace function public.my_social(p_id uuid, p_secret text) returns json
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public._hw_check(p_id, p_secret);
  update public.players set last_seen = now() where id = p_id;
  return json_build_object(
    'me', (select json_build_object('id', id, 'code', code, 'name', name) from public.players where id = p_id),
    'friends', coalesce((select json_agg(json_build_object('id', p.id, 'name', p.name, 'code', p.code, 'last_seen', p.last_seen) order by p.name)
       from (select distinct case when f.a = p_id then f.b else f.a end as other from public.friend_links f
             where (f.a = p_id or f.b = p_id) and f.status = 'accepted') x join public.players p on p.id = x.other), '[]'::json),
    'incoming', coalesce((select json_agg(json_build_object('id', p.id, 'name', p.name, 'code', p.code) order by f.created_at desc)
       from public.friend_links f join public.players p on p.id = f.a where f.b = p_id and f.status = 'pending'), '[]'::json),
    'outgoing', coalesce((select json_agg(json_build_object('id', p.id, 'name', p.name, 'code', p.code) order by f.created_at desc)
       from public.friend_links f join public.players p on p.id = f.b where f.a = p_id and f.status = 'pending'), '[]'::json),
    'invites', coalesce((select json_agg(json_build_object('id', i.id, 'from_id', i.from_id, 'from_name', p.name, 'kind', i.kind, 'game', i.game, 'env', i.env, 'map', i.map, 'diff', i.diff, 'seed', i.seed, 'created_at', i.created_at) order by i.created_at desc)
       from public.invites i join public.players p on p.id = i.from_id
       where i.to_id = p_id and i.status = 'open' and i.created_at > now() - interval '15 minutes'), '[]'::json),
    'sent', coalesce((select json_agg(json_build_object('id', i.id, 'to_id', i.to_id, 'to_name', p.name, 'kind', i.kind, 'map', i.map, 'diff', i.diff, 'seed', i.seed, 'status', i.status, 'created_at', i.created_at) order by i.created_at desc)
       from public.invites i join public.players p on p.id = i.to_id
       where i.from_id = p_id and i.created_at > now() - interval '15 minutes'), '[]'::json)
  );
end $$;

-- ---------- vrienden ----------
create or replace function public.friend_request(p_id uuid, p_secret text, p_code text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare v_target uuid;
begin
  perform public._hw_check(p_id, p_secret);
  select id into v_target from public.players where code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if v_target is null then return 'notfound'; end if;
  if v_target = p_id then return 'self'; end if;
  if exists (select 1 from public.friend_links where ((a = p_id and b = v_target) or (a = v_target and b = p_id)) and status = 'accepted') then return 'already'; end if;
  if exists (select 1 from public.friend_links where a = v_target and b = p_id and status = 'pending') then
    update public.friend_links set status = 'accepted' where a = v_target and b = p_id; return 'accepted';
  end if;
  if (select count(*) from public.friend_links where a = p_id and status = 'pending') >= 30 then return 'limit'; end if;
  insert into public.friend_links (a, b) values (p_id, v_target)
    on conflict (a, b) do update set status = 'pending', created_at = now() where public.friend_links.status in ('declined', 'removed');
  return 'sent';
end $$;

create or replace function public.friend_respond(p_id uuid, p_secret text, p_other uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public._hw_check(p_id, p_secret);
  update public.friend_links set status = case when p_accept then 'accepted' else 'declined' end where a = p_other and b = p_id and status = 'pending';
  return case when p_accept then 'accepted' else 'declined' end;
end $$;

create or replace function public.friend_remove(p_id uuid, p_secret text, p_other uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public._hw_check(p_id, p_secret);
  update public.friend_links set status = 'removed' where ((a = p_id and b = p_other) or (a = p_other and b = p_id)) and status in ('pending', 'accepted');
  return 'removed';
end $$;

-- ---------- uitnodigingen ----------
create or replace function public.invite_send(p_id uuid, p_secret text, p_to uuid, p_kind text, p_map text, p_diff int, p_env text default 'live') returns json
language plpgsql security definer set search_path = public, extensions as $$
declare v_inv public.invites;
begin
  perform public._hw_check(p_id, p_secret);
  if not exists (select 1 from public.friend_links where ((a = p_id and b = p_to) or (a = p_to and b = p_id)) and status = 'accepted') then raise exception 'notfriends'; end if;
  update public.invites set status = 'cancelled' where from_id = p_id and to_id = p_to and status = 'open';
  insert into public.invites (from_id, to_id, kind, map, diff, env) values (p_id, p_to, p_kind, p_map, p_diff, coalesce(p_env, 'live')) returning * into v_inv;
  return json_build_object('id', v_inv.id, 'seed', v_inv.seed, 'kind', v_inv.kind, 'map', v_inv.map, 'diff', v_inv.diff);
end $$;

create or replace function public.invite_respond(p_id uuid, p_secret text, p_invite uuid, p_accept boolean) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare v_inv public.invites;
begin
  perform public._hw_check(p_id, p_secret);
  update public.invites set status = case when p_accept then 'accepted' else 'declined' end
   where id = p_invite and to_id = p_id and status = 'open' and created_at > now() - interval '15 minutes' returning * into v_inv;
  if v_inv.id is null then return json_build_object('ok', false); end if;
  return json_build_object('ok', true, 'id', v_inv.id, 'from_id', v_inv.from_id, 'kind', v_inv.kind, 'map', v_inv.map, 'diff', v_inv.diff, 'seed', v_inv.seed);
end $$;

create or replace function public.invite_cancel(p_id uuid, p_secret text, p_invite uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public._hw_check(p_id, p_secret);
  update public.invites set status = 'cancelled' where id = p_invite and from_id = p_id and status = 'open';
  return 'cancelled';
end $$;

grant execute on function public.register_player(uuid, text, text) to anon, authenticated;
grant execute on function public.my_social(uuid, text) to anon, authenticated;
grant execute on function public.friend_request(uuid, text, text) to anon, authenticated;
grant execute on function public.friend_respond(uuid, text, uuid, boolean) to anon, authenticated;
grant execute on function public.friend_remove(uuid, text, uuid) to anon, authenticated;
grant execute on function public.invite_send(uuid, text, uuid, text, text, int, text) to anon, authenticated;
grant execute on function public.invite_respond(uuid, text, uuid, boolean) to anon, authenticated;
grant execute on function public.invite_cancel(uuid, text, uuid) to anon, authenticated;
