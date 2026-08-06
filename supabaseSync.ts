/**
 * supabaseSync.ts — Aethon Beacon cross-device sync
 *
 * Setup (one-time):
 * 1. Create a free project at https://supabase.com
 * 2. Copy your Project URL and anon key from Settings → API
 * 3. Add to your .env (or app.config.ts expo env):
 *      EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *      EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
 * 4. In Supabase SQL Editor, run:
 *      CREATE TABLE IF NOT EXISTS beacon_sync (
 *        user_id TEXT NOT NULL,
 *        key TEXT NOT NULL,
 *        value JSONB,
 *        updated_at TIMESTAMPTZ DEFAULT now(),
 *        PRIMARY KEY (user_id, key)
 *      );
 *      ALTER TABLE beacon_sync ENABLE ROW LEVEL SECURITY;
 *      CREATE POLICY "user owns rows" ON beacon_sync
 *        USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub')
 *        WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
 *
 * How it works:
 * - All user data (entries, journal, profile) is stored locally in AsyncStorage (unchanged)
 * - When the user verifies phone or email, their local data is pushed to Supabase keyed by phone/email
 * - On fresh install, if the same phone/email is verified, data is pulled and merged
 * - No Supabase auth required — user_id is the verified phone or email hash
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ── Config ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = (
  typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_SUPABASE_URL : ""
) ?? "";

const SUPABASE_ANON_KEY = (
  typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY : ""
) ?? "";

export const supabaseConfigured =
  SUPABASE_URL.trim().length > 0 && SUPABASE_ANON_KEY.trim().length > 0;

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL.trim(), SUPABASE_ANON_KEY.trim(), {
      auth: { persistSession: false },
      global: {
        headers: { "x-client": `aethon-beacon/${Platform.OS}` }
      }
    });
  }
  return _client;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Simple deterministic ID from a verified identifier (phone or email).
 * Exported so entitlements.ts (and anywhere else that needs to key off the
 * same cross-device identity, e.g. Purchases.logIn(userId) for RevenueCat)
 * uses this exact normalization instead of a second, driftable copy of it.
 */
export function makeUserId(identifier: string): string {
  // lowercase + strip spaces so "user@email.com" and "USER@EMAIL.COM" are the same
  return identifier.trim().toLowerCase().replace(/\s+/g, "");
}

// Keys we sync — anything else stays local-only
const SYNC_KEYS = [
  "@aethon_entries",
  "@aethon_issue_guide_id",
  "@aethon_language_id",
  "@aethon_profile_dob",
  "@aethon_profile_display_name",
  "@aethon_profile_phone",
  "@aethon_profile_email",
  "@aethon_profile_role_id",
  "@aethon_profile_gender",
  "@aethon_profile_phone_verified",
  "@aethon_profile_email_verified",
  "@aethon_reminder_enabled",
  "@aethon_reminder_choice",
  "@aethon_follow_up_mode",
  "@aethon_check_in_streak",
  "@aethon_streak_updated_at",
  "@aethon_journey_step_index",
  "@aethon_journey_card_dismissed",
] as const;

export type SyncKey = (typeof SYNC_KEYS)[number];

// ── Push (local → Supabase) ─────────────────────────────────────────────────

export async function pushToSupabase(verifiedIdentifier: string): Promise<{ ok: boolean; pushed: number; error?: string }> {
  const client = getClient();
  if (!client) return { ok: false, pushed: 0, error: "Supabase not configured" };

  const userId = makeUserId(verifiedIdentifier);
  const pairs = await AsyncStorage.multiGet(SYNC_KEYS as unknown as string[]);
  const rows: Array<{ user_id: string; key: string; value: unknown; updated_at: string }> = [];
  const now = new Date().toISOString();

  for (const [key, raw] of pairs) {
    if (raw === null) continue;
    let value: unknown;
    try { value = JSON.parse(raw); } catch { value = raw; }
    rows.push({ user_id: userId, key, value, updated_at: now });
  }

  if (rows.length === 0) return { ok: true, pushed: 0 };

  const { error } = await client.from("beacon_sync").upsert(rows, { onConflict: "user_id,key" });
  if (error) return { ok: false, pushed: 0, error: error.message };
  return { ok: true, pushed: rows.length };
}

// ── Pull (Supabase → local) ─────────────────────────────────────────────────

export async function pullFromSupabase(verifiedIdentifier: string): Promise<{ ok: boolean; pulled: number; error?: string }> {
  const client = getClient();
  if (!client) return { ok: false, pulled: 0, error: "Supabase not configured" };

  const userId = makeUserId(verifiedIdentifier);
  const { data, error } = await client
    .from("beacon_sync")
    .select("key, value, updated_at")
    .eq("user_id", userId);

  if (error) return { ok: false, pulled: 0, error: error.message };
  if (!data || data.length === 0) return { ok: true, pulled: 0 };

  const pairs: Array<[string, string]> = data.map((row) => [
    row.key as string,
    typeof row.value === "string" ? row.value : JSON.stringify(row.value)
  ]);

  await AsyncStorage.multiSet(pairs);
  return { ok: true, pulled: data.length };
}

// ── Sync status ─────────────────────────────────────────────────────────────

export async function getLastSyncedAt(verifiedIdentifier: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const userId = makeUserId(verifiedIdentifier);
  const { data } = await client
    .from("beacon_sync")
    .select("updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  return typeof data?.updated_at === "string" ? data.updated_at : null;
}
