-- Aethon Beacon -- Community message reactions schema
--
-- Run this once in the Supabase SQL Editor for your project
-- (isfkxmrathirqkrwfagg): left sidebar icon that looks like a terminal
-- ("SQL Editor") -> New query -> paste this whole file -> Run.
-- Run this AFTER supabase_community_schema.sql (this table references
-- aethon_community_messages via a foreign key).
--
-- This creates ONE table, aethon_community_reactions, that lets members
-- tap a small fixed set of emoji on a feed post or chat message and see a
-- live count. Row Level Security is set up so:
--   - anyone (using the public anon/publishable key baked into the app)
--     can READ all reactions -- needed so everyone sees the same live counts
--   - anyone can INSERT a reaction, with checks limiting it to one of a
--     small allowed emoji set and a sane text length, plus a unique
--     constraint so the same device can't spam-react with the same emoji
--     on the same message over and over
--   - anyone can DELETE a reaction (this is intentionally open, same
--     insert-heavy/no-real-auth trust model as the rest of Community --
--     see the note in supabase_community_schema.sql. There is no real
--     per-user auth in this app, only a locally generated client_id that
--     ships in the request and could be spoofed by anyone with the anon
--     key, so RLS cannot actually enforce "only delete your own reaction."
--     The app's own UI only ever sends a delete for the current device's
--     own client_id, so in normal use this only ever un-reacts your own
--     tap -- but treat this table the same as everything else in Community:
--     low security bar, moderated out-of-band if it's ever abused, nothing
--     sensitive stored here (just an emoji + a message id + a client id).

create table if not exists public.aethon_community_reactions (
  id text primary key,
  message_id text not null references public.aethon_community_messages (id) on delete cascade,
  emoji text not null check (emoji in ('❤️', '🙏', '💪', '😢', '👏', '🤝')),
  reactor_client_id text not null check (char_length(reactor_client_id) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (message_id, emoji, reactor_client_id)
);

create index if not exists aethon_community_reactions_message_id_idx
  on public.aethon_community_reactions (message_id);

alter table public.aethon_community_reactions enable row level security;

drop policy if exists "public can read reactions" on public.aethon_community_reactions;
create policy "public can read reactions"
  on public.aethon_community_reactions
  for select
  using (true);

drop policy if exists "anyone can add a reaction" on public.aethon_community_reactions;
create policy "anyone can add a reaction"
  on public.aethon_community_reactions
  for insert
  with check (
    emoji in ('❤️', '🙏', '💪', '😢', '👏', '🤝')
    and char_length(reactor_client_id) between 1 and 120
  );

drop policy if exists "anyone can remove a reaction" on public.aethon_community_reactions;
create policy "anyone can remove a reaction"
  on public.aethon_community_reactions
  for delete
  using (true);

-- DELETE realtime payloads only include the primary key column by default
-- (Postgres only replicates what changed unless told otherwise), but the
-- app needs message_id/emoji/reactor_client_id on delete too, to know which
-- reaction pill to decrement. REPLICA IDENTITY FULL sends the whole old row.
alter table public.aethon_community_reactions replica identity full;

-- Enable realtime (INSERT + DELETE) events so live reaction counts update
-- on every member's screen without a manual refresh.
alter publication supabase_realtime add table public.aethon_community_reactions;
