# Aethon Beacon Supabase Realtime Setup

Realtime community feed/chat activates only when these public Expo env vars are present at build/runtime:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-SUPABASE-ANON-KEY
```

Required Supabase steps:

1. Open Supabase SQL Editor.
2. Run `supabase/aethon_community_messages.sql`.
3. In Supabase Realtime/Replication, confirm `public.aethon_community_messages` is enabled.
4. Rebuild web/Android/iOS with the env vars available.

App behavior:

- If Supabase is configured and the table is reachable: Community shows `Realtime connected` and feed/chat messages sync live.
- If Supabase env/tables are missing: Community shows `Local fallback` or a realtime error and continues working locally.
- Client-side moderation blocks unsafe content before insert. For stronger production control, move insert behind a Supabase Edge Function with server-side moderation/auth.
