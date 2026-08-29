/**
 * supabaseSync.ts — NAYIQ cross-device sync
 *
 * Setup (one-time):
 * 1. Create a project at https://supabase.com
 * 2. Copy the Project URL and anon key from Settings → API
 * 3. Add to .env (or app.config.ts expo env):
 *      EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *      EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
 * 4. In the Supabase SQL editor:
 *      CREATE TABLE IF NOT EXISTS beacon_sync (
 *        user_id TEXT NOT NULL,
 *        key TEXT NOT NULL,
 *        value JSONB,
 *        updated_at TIMESTAMPTZ DEFAULT now(),
 *        PRIMARY KEY (user_id, key)
 *      );
 *
 * How it works
 * ------------
 * All user data lives locally in one AsyncStorage blob (STORAGE_KEY below).
 * This module syncs that blob to Supabase one row per top-level field, so the
 * table's own updated_at gives every field an independent timestamp and two
 * devices editing different things never overwrite each other.
 *
 * Merge rules, per field, on pull:
 *   - local unchanged since the last sync  -> take remote
 *   - remote unchanged since the last sync -> keep local
 *   - both changed, and the field is a list of identified records
 *                                          -> union by id, newest wins per id
 *   - both changed, anything else          -> newer timestamp wins
 *
 * The last successfully synced payload is kept as a local snapshot; that is
 * what "changed since the last sync" is measured against, which is what makes
 * the three-way merge possible without a server-side history.
 *
 * A previous version of this file synced a list of legacy per-field storage
 * keys that the app has never written. Every multiGet returned null, every push
 * sent zero rows, and the function still reported success -- so sync silently
 * did nothing. Rows are now derived from the real payload above.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  FIELD_CAPS,
  LOCAL_ONLY_FIELDS,
  capped,
  mergeField,
  same,
  type Payload
} from "./syncMerge";

// ── Config ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = (
  typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_SUPABASE_URL : ""
) ?? "";

const SUPABASE_ANON_KEY = (
  typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY : ""
) ?? "";

export const supabaseConfigured =
  SUPABASE_URL.trim().length > 0 && SUPABASE_ANON_KEY.trim().length > 0;

/** The single blob the app actually persists. Must match App.tsx's STORAGE_KEY. */
export const SYNC_STORAGE_KEY = "aethon-beacon:v2";

/** Snapshot of the last payload we successfully synced, for three-way merge. */
const SNAPSHOT_KEY = "nayiq:sync:snapshot:v3";
const META_KEY = "nayiq:sync:meta:v3";

/** Bumped when the row layout changes, so old rows are ignored rather than mis-merged. */
const SCHEMA = "v3";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL.trim(), SUPABASE_ANON_KEY.trim(), {
      auth: { persistSession: false },
      global: { headers: { "x-client": `nayiq/${Platform.OS}` } }
    });
  }
  return _client;
}

export function makeUserId(identifier: string): string {
  return identifier.trim().toLowerCase().replace(/\s+/g, "");
}

type SyncMeta = { lastPushedAt?: string; lastPulledAt?: string; lastError?: string };

export type SyncOutcome = {
  ok: boolean;
  pushed: number;
  pulled: number;
  merged: Payload | null;
  error?: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

// ── Sync ───────────────────────────────────────────────────────────────────

/**
 * Pull, merge and push in one pass.
 *
 * Returns the merged payload when the merge changed anything locally, so the
 * caller can apply it to live state; returns null when local was already
 * current. Never throws -- sync is best-effort and must not break the app.
 */
export async function syncNow(verifiedIdentifier: string): Promise<SyncOutcome> {
  const client = getClient();
  if (!client) return { ok: false, pushed: 0, pulled: 0, merged: null, error: "Supabase not configured" };

  const userId = makeUserId(verifiedIdentifier);
  if (!userId) return { ok: false, pushed: 0, pulled: 0, merged: null, error: "No verified identifier" };

  const local = (await readJson<Payload>(SYNC_STORAGE_KEY)) ?? {};
  const snapshot = (await readJson<Payload>(SNAPSHOT_KEY)) ?? {};

  const { data, error } = await client
    .from("beacon_sync")
    .select("key, value, updated_at")
    .eq("user_id", userId)
    .like("key", `${SCHEMA}:%`);

  if (error) {
    await AsyncStorage.setItem(META_KEY, JSON.stringify({ lastError: error.message } satisfies SyncMeta));
    return { ok: false, pushed: 0, pulled: 0, merged: null, error: error.message };
  }

  const remote = new Map<string, { value: unknown; updatedAt: number }>();
  for (const row of data ?? []) {
    const key = String((row as Record<string, unknown>).key ?? "").slice(SCHEMA.length + 1);
    if (!key) continue;
    remote.set(key, {
      value: (row as Record<string, unknown>).value,
      updatedAt: Date.parse(String((row as Record<string, unknown>).updated_at ?? "")) || 0
    });
  }

  const merged: Payload = { ...local };
  let changedLocally = false;

  const lastSyncedAt = Date.parse(String((await readJson<SyncMeta>(META_KEY))?.lastPushedAt ?? "")) || 0;

  for (const [field, entry] of remote) {
    const { value, changed } = mergeField({
      field,
      localValue: local[field],
      baseValue: snapshot[field],
      remoteValue: entry.value,
      remoteUpdatedAt: entry.updatedAt,
      lastSyncedAt
    });
    if (changed) {
      merged[field] = value;
      changedLocally = true;
    }
  }

  // Push every field that differs from the snapshot -- including the fields we
  // just merged, so the other device converges on the same result.
  const now = new Date().toISOString();
  const rows: Array<{ user_id: string; key: string; value: unknown; updated_at: string }> = [];
  for (const [field, value] of Object.entries(merged)) {
    if (LOCAL_ONLY_FIELDS.has(field)) continue;
    if (typeof value === "undefined") continue;
    const outgoing = capped(field, value);
    if (same(outgoing, snapshot[field]) && same(outgoing, remote.get(field)?.value)) continue;
    rows.push({ user_id: userId, key: `${SCHEMA}:${field}`, value: outgoing ?? null, updated_at: now });
  }

  let pushed = 0;
  if (rows.length > 0) {
    // Chunked so a large first sync cannot exceed the request body limit.
    for (let i = 0; i < rows.length; i += 40) {
      const chunk = rows.slice(i, i + 40);
      const { error: upsertError } = await client
        .from("beacon_sync")
        .upsert(chunk, { onConflict: "user_id,key" });
      if (upsertError) {
        await AsyncStorage.setItem(META_KEY, JSON.stringify({ lastError: upsertError.message } satisfies SyncMeta));
        return { ok: false, pushed, pulled: remote.size, merged: changedLocally ? merged : null, error: upsertError.message };
      }
      pushed += chunk.length;
    }
  }

  if (changedLocally) {
    await AsyncStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(merged)).catch(() => undefined);
  }
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(merged)).catch(() => undefined);
  await AsyncStorage.setItem(
    META_KEY,
    JSON.stringify({ lastPushedAt: now, lastPulledAt: now } satisfies SyncMeta)
  ).catch(() => undefined);

  return { ok: true, pushed, pulled: remote.size, merged: changedLocally ? merged : null };
}

export async function getSyncStatus(): Promise<{
  configured: boolean;
  lastPushedAt: string | null;
  lastPulledAt: string | null;
  lastError: string | null;
}> {
  const meta = (await readJson<SyncMeta>(META_KEY)) ?? {};
  return {
    configured: supabaseConfigured,
    lastPushedAt: meta.lastPushedAt ?? null,
    lastPulledAt: meta.lastPulledAt ?? null,
    lastError: meta.lastError ?? null
  };
}

// ── Back-compat wrappers ───────────────────────────────────────────────────

export async function pushToSupabase(verifiedIdentifier: string) {
  const out = await syncNow(verifiedIdentifier);
  return { ok: out.ok, pushed: out.pushed, error: out.error };
}

export async function pullFromSupabase(verifiedIdentifier: string) {
  const out = await syncNow(verifiedIdentifier);
  return { ok: out.ok, pulled: out.pulled, error: out.error };
}

export async function getLastSyncedAt(): Promise<string | null> {
  return (await getSyncStatus()).lastPushedAt;
}
