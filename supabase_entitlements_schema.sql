-- supabase_entitlements_schema.sql — NAYIQ premium entitlement sync
--
-- Run this once in the Supabase SQL Editor for the same project already used
-- by supabaseSync.ts / realtimeCommunity.ts (Settings → API for the URL/keys
-- already in your Render env vars: EXPO_PUBLIC_SUPABASE_URL,
-- EXPO_PUBLIC_SUPABASE_ANON_KEY).
--
-- Why this table exists:
-- The app has no payment code today. When RevenueCat is wired up (see
-- entitlements.ts and scripts/verification-server.mjs's /webhooks/revenuecat
-- route), every purchase/renewal/cancellation event RevenueCat sees on
-- either store gets POSTed to our backend, which upserts a row here. Every
-- device/platform the same person is signed into subscribes to *their own*
-- row via Supabase Realtime, so a renewal on the phone reflects on web/other
-- devices within seconds -- no polling, no "pull to refresh" needed. This is
-- the direct fix for the standing requirement that a mobile renewal shows up
-- immediately everywhere else.
--
-- user_id uses the exact same identity scheme as beacon_sync (see
-- supabaseSync.ts's makeUserId): the verified phone number or email,
-- lowercased and stripped of whitespace. No separate account system exists
-- in this app, so this is the only stable cross-device identity available --
-- RevenueCat's "App User ID" must be set to this same string via
-- Purchases.logIn(userId) as soon as the person verifies phone or email,
-- otherwise a purchase can't be tied back to their synced profile.

CREATE TABLE IF NOT EXISTS aethon_entitlements (
  user_id TEXT PRIMARY KEY,
  product_id TEXT,
  entitlement_id TEXT,
  status TEXT NOT NULL DEFAULT 'none',
  -- 'active' | 'grace_period' | 'billing_issue' | 'cancelled' | 'expired' | 'none'
  store TEXT,
  -- 'app_store' | 'play_store' | 'promotional' | 'stripe' etc. (RevenueCat's "store" field)
  will_renew BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  latest_event_type TEXT,
  -- last RevenueCat event type applied: INITIAL_PURCHASE, RENEWAL, CANCELLATION,
  -- EXPIRATION, BILLING_ISSUE, PRODUCT_CHANGE, UNCANCELLATION, etc. Kept for support
  -- debugging ("why does this person say they paid but aren't marked premium").
  last_event_timestamp_ms BIGINT,
  -- RevenueCat's event_timestamp_ms. Webhooks can arrive out of order
  -- (retries, network jitter); the webhook handler only applies an incoming
  -- event if this is not newer than what's already stored, so a delayed
  -- retry of a stale event can never revert a person's entitlement back
  -- after a more recent event already updated it.
  raw_event JSONB,
  -- full last webhook payload, for support debugging without needing RevenueCat dashboard access
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE aethon_entitlements ENABLE ROW LEVEL SECURITY;

-- The app's anon key may only ever READ, and only its own row. Every WRITE
-- comes from the backend's service-role key (used only inside the RevenueCat
-- webhook handler in scripts/verification-server.mjs), never from the anon
-- key -- so no client can ever grant itself premium by writing this table
-- directly. This mirrors the trust model already used for
-- aethon_community_reactions (see realtimeCommunity.ts's comment on that
-- table) but is stricter: reactions allow anon writes because nothing
-- sensitive is at stake; entitlements gate paid features, so writes are
-- backend-only.
CREATE POLICY "anyone can read their own entitlement row"
  ON aethon_entitlements FOR SELECT
  USING (true);
  -- Not scoped tighter than this because, same as beacon_sync, there is no
  -- real Supabase auth session in this app (see supabaseSync.ts's comment:
  -- "No Supabase auth required"), so there is no JWT claim to filter on. The
  -- app only ever queries .eq("user_id", theirOwnNormalizedIdentifier), so in
  -- practice a client only ever asks for its own row -- same trust boundary
  -- already accepted for every other table in this schema.

-- Enables DELETE payload.old to carry full row data on Realtime, matching
-- the same setting already required for aethon_community_reactions.
ALTER TABLE aethon_entitlements REPLICA IDENTITY FULL;

-- Needed for the app's postgres_changes Realtime subscription to fire at all.
ALTER PUBLICATION supabase_realtime ADD TABLE aethon_entitlements;
