-- NAYIQ -- Community report intake table
--
-- Run this once in the Supabase SQL Editor for isfkxmrathirqkrwfagg, same
-- way as supabase_community_schema.sql (SQL Editor -> New query -> paste ->
-- Run).
--
-- Previously, tapping "Report" on a community post only ever wrote to the
-- reporting device's own AsyncStorage (communityReports state in App.tsx).
-- That meant a real report from a real member never reached the person
-- actually running the app -- it only showed up in an admin session
-- happening to run on that exact same phone. This table gives reports a
-- real, durable landing place.
--
-- RLS here is deliberately insert-only for the anon/publishable key:
-- anyone can SUBMIT a report (that's the whole point -- it should be easy
-- to flag something), but nobody can SELECT/read reports back through the
-- app's anon key. That keeps other members' reports private from each
-- other. Review reports directly in the Supabase dashboard's Table Editor
-- (Authentication isn't needed for that -- it's your own project) rather
-- than through the app, since the app has no real per-user auth to
-- restrict an in-app "view reports" screen to just the operator.

create table if not exists public.aethon_community_reports (
  id text primary key,
  created_at timestamptz not null default now(),
  target text not null check (target in ('feed', 'chat')),
  target_id text not null,
  reason text not null check (char_length(reason) between 1 and 40),
  snippet text not null check (char_length(snippet) between 1 and 200),
  reporter_client_id text
);

create index if not exists aethon_community_reports_created_at_idx on public.aethon_community_reports (created_at desc);

alter table public.aethon_community_reports enable row level security;

drop policy if exists "anyone can submit a report" on public.aethon_community_reports;

create policy "anyone can submit a report" on public.aethon_community_reports for insert with check (char_length(reason) between 1 and 40 and char_length(snippet) between 1 and 200 and target in ('feed', 'chat'));

grant usage on schema public to anon, authenticated;
grant insert on table public.aethon_community_reports to anon, authenticated;
revoke select, update, delete on table public.aethon_community_reports from anon, authenticated;
