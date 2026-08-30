-- NAYIQ realtime community messaging schema
-- Run this in Supabase SQL Editor.
-- Then confirm Realtime is enabled for public.aethon_community_messages.

create table if not exists public.aethon_community_messages (
  id text primary key,
  kind text not null default 'feed',
  created_at timestamptz not null default now(),
  author text not null default 'Community member',
  role text not null default 'user',
  tag text,
  text text not null,
  topic text,
  persona text,
  client_id text,
  is_hidden boolean not null default false,
  reported_count integer not null default 0
);

-- Idempotent upgrades for projects where the table already existed.
alter table public.aethon_community_messages
  add column if not exists kind text not null default 'feed',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists author text not null default 'Community member',
  add column if not exists role text not null default 'user',
  add column if not exists tag text,
  add column if not exists text text,
  add column if not exists topic text,
  add column if not exists persona text,
  add column if not exists client_id text,
  add column if not exists is_hidden boolean not null default false,
  add column if not exists reported_count integer not null default 0;

-- Backfill/fix nullable rows before adding/validating constraints.
update public.aethon_community_messages set kind = 'feed' where kind is null;
update public.aethon_community_messages set created_at = now() where created_at is null;
update public.aethon_community_messages set author = 'Community member' where author is null or trim(author) = '';
update public.aethon_community_messages set role = 'user' where role is null or trim(role) = '';
update public.aethon_community_messages set text = '[removed]' where text is null or trim(text) = '';
update public.aethon_community_messages set is_hidden = false where is_hidden is null;
update public.aethon_community_messages set reported_count = 0 where reported_count is null;

alter table public.aethon_community_messages
  alter column kind set not null,
  alter column created_at set not null,
  alter column author set not null,
  alter column role set not null,
  alter column text set not null,
  alter column is_hidden set not null,
  alter column reported_count set not null;

-- Replace constraints idempotently.
alter table public.aethon_community_messages drop constraint if exists aethon_community_messages_kind_check;
alter table public.aethon_community_messages add constraint aethon_community_messages_kind_check
  check (kind in ('feed', 'chat'));

alter table public.aethon_community_messages drop constraint if exists aethon_community_messages_role_check;
alter table public.aethon_community_messages add constraint aethon_community_messages_role_check
  check (role in ('user', 'verified', 'moderator'));

alter table public.aethon_community_messages drop constraint if exists aethon_community_messages_persona_check;
alter table public.aethon_community_messages add constraint aethon_community_messages_persona_check
  check (persona is null or persona in ('moderator', 'mentor', 'support'));

alter table public.aethon_community_messages drop constraint if exists aethon_community_messages_text_length_check;
alter table public.aethon_community_messages add constraint aethon_community_messages_text_length_check
  check (char_length(trim(text)) between 1 and 1200);

create index if not exists aethon_community_messages_kind_created_at_idx
  on public.aethon_community_messages (kind, created_at desc);

alter table public.aethon_community_messages enable row level security;

-- Public/anon read for non-hidden messages. The app still requires local verification before showing the community UI.
drop policy if exists "read visible community messages" on public.aethon_community_messages;
create policy "read visible community messages"
  on public.aethon_community_messages
  for select
  using (is_hidden = false);

-- Public/anon insert for app-submitted messages. Client-side safety checks run before insert.
-- For stricter production moderation, replace this with an Edge Function or authenticated policy.
drop policy if exists "insert community messages" on public.aethon_community_messages;
create policy "insert community messages"
  on public.aethon_community_messages
  for insert
  with check (
    is_hidden = false
    and role in ('user', 'verified', 'moderator')
    and kind in ('feed', 'chat')
    and char_length(trim(text)) between 1 and 1200
  );

-- Tables created through SQL Editor do not always inherit API grants. RLS
-- decides which rows are allowed; these grants decide which operations the
-- public app roles may attempt at all. Updates/deletes stay backend-only.
grant usage on schema public to anon, authenticated;
grant select, insert on table public.aethon_community_messages to anon, authenticated;
revoke update, delete on table public.aethon_community_messages from anon, authenticated;

-- Enable Realtime publication when permissions allow it.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.aethon_community_messages;
    exception
      when duplicate_object then null;
      when insufficient_privilege then null;
    end;
  end if;
end $$;

-- Optional seed messages, safe to rerun.
insert into public.aethon_community_messages (id, kind, author, role, tag, text, topic, persona)
values
  ('seed-feed-aethon-guide-1', 'feed', 'NAYIQ Guide', 'verified', 'Guidance', 'Welcome to the realtime community feed. Keep posts specific, kind, and safe.', 'general', null),
  ('seed-chat-aethon-guide-1', 'chat', 'Verified Mentor', 'verified', null, 'Realtime chat is ready. Share one clear next step or one question.', null, 'mentor')
on conflict (id) do update set
  author = excluded.author,
  role = excluded.role,
  tag = excluded.tag,
  text = excluded.text,
  topic = excluded.topic,
  persona = excluded.persona;
