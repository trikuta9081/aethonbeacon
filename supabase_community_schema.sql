-- Aethon Beacon -- Community feed/chat schema
--
-- Run this once in the Supabase SQL Editor for your project
-- (isfkxmrathirqkrwfagg): left sidebar icon that looks like a terminal
-- ("SQL Editor") -> New query -> paste this whole file -> Run.
--
-- This creates the ONE table realtimeCommunity.ts actually needs
-- (aethon_community_messages), with Row Level Security locked down so:
--   - anyone (using the public anon/publishable key baked into the app)
--     can READ messages that aren't hidden
--   - anyone can INSERT a new message, with basic sanity checks (non-empty
--     text, capped length, valid kind) so a malformed client can't corrupt
--     rows or mark its own message hidden on arrival
--   - nobody can UPDATE or DELETE via the anon key (no policies for those
--     actions = denied by default once RLS is on) -- moderation, if you add
--     it later, should go through a service-role key on your own backend,
--     never the client-side anon key.
--
-- NOTE: this intentionally does NOT create `beacon_sync` (the separate
-- cross-device profile/journal sync table referenced in supabaseSync.ts).
-- That table would key rows by the user's raw phone number or email
-- (see makeUserId() in supabaseSync.ts -- it's lowercased/trimmed, not
-- actually hashed despite the comment above it), and the app doesn't use
-- real Supabase Auth (no sign-in call anywhere, client created with
-- persistSession: false). That means anyone holding the public anon key
-- -- which ships inside the APK/IPA and is trivial to extract -- could
-- query beacon_sync by guessing/knowing a phone number and read someone's
-- private journal entries and profile data. Until that feature has real
-- per-user auth (or a server-side proxy that checks OTP verification
-- before allowing reads), it's safer to leave it unprovisioned: the app's
-- own code already treats sync failures as best-effort/silent
-- (`.catch(() => undefined)`), so nothing breaks -- cross-device sync
-- just stays off, same as it's always effectively been.

create table if not exists public.aethon_community_messages (
  id text primary key,
  kind text not null check (kind in ('feed', 'chat')),
  created_at timestamptz not null default now(),
  author text not null check (char_length(author) between 1 and 80),
  role text not null default 'user' check (role in ('user', 'verified', 'moderator')),
  tag text,
  text text not null check (char_length(text) between 1 and 2000),
  topic text,
  persona text check (persona is null or persona in ('moderator', 'mentor', 'support')),
  is_hidden boolean not null default false,
  client_id text
);

create index if not exists aethon_community_messages_created_at_idx
  on public.aethon_community_messages (created_at desc);

alter table public.aethon_community_messages enable row level security;

drop policy if exists "public can read visible messages" on public.aethon_community_messages;
create policy "public can read visible messages"
  on public.aethon_community_messages
  for select
  using (is_hidden = false);

drop policy if exists "anyone can post a message" on public.aethon_community_messages;
create policy "anyone can post a message"
  on public.aethon_community_messages
  for insert
  with check (
    is_hidden = false
    and kind in ('feed', 'chat')
    and char_length(text) between 1 and 2000
    and char_length(author) between 1 and 80
  );

-- Enable realtime (INSERT) events so subscribeRealtimeCommunityMessages()
-- in realtimeCommunity.ts actually receives live updates instead of only
-- working via polling/refresh.
alter publication supabase_realtime add table public.aethon_community_messages;
