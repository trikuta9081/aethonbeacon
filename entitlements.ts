/**
 * entitlements.ts — Aethon Beacon premium entitlement sync
 *
 * The read/subscribe half of the RevenueCat integration. See
 * supabase_entitlements_schema.sql for the table this reads, and
 * scripts/verification-server.mjs's /webhooks/revenuecat route for the only
 * thing that ever writes to it (this module is intentionally read-only --
 * a client granting itself premium by writing this table directly would
 * defeat the whole point).
 *
 * Identity: uses the exact same normalized-phone-or-email user_id as
 * supabaseSync.ts's makeUserId, re-exported from there so there is only one
 * definition. RevenueCat's "App User ID" must be set to this same value via
 * Purchases.logIn(userId) as soon as the person verifies phone or email --
 * see the ENTITLEMENT_SETUP_CHECKLIST.md for exactly where that call needs
 * to go.
 *
 * Pattern mirrors realtimeCommunity.ts: lazy singleton client, typed row
 * mapper, fetch + Realtime subscribe. If you're familiar with that file,
 * this one should read as "the same shape, one row instead of a feed."
 */

import { createClient, RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

export type EntitlementStatus =
  | "active"
  | "grace_period"
  | "billing_issue"
  | "cancelled"
  | "expired"
  | "none";

export type Entitlement = {
  userId: string;
  productId: string | null;
  entitlementId: string | null;
  status: EntitlementStatus;
  store: string | null;
  willRenew: boolean;
  expiresAt: string | null;
  updatedAt: string;
};

type EntitlementRow = {
  user_id: string;
  product_id: string | null;
  entitlement_id: string | null;
  status: string | null;
  store: string | null;
  will_renew: boolean | null;
  expires_at: string | null;
  updated_at: string;
};

const SUPABASE_URL = (
  typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_SUPABASE_URL : ""
) ?? "";

const SUPABASE_ANON_KEY = (
  typeof process !== "undefined" ? process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY : ""
) ?? "";

export const entitlementsConfigured =
  SUPABASE_URL.trim().length > 0 && SUPABASE_ANON_KEY.trim().length > 0;

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (!entitlementsConfigured) return null;
  if (!client) {
    client = createClient(SUPABASE_URL.trim(), SUPABASE_ANON_KEY.trim(), {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 4 } },
      global: {
        headers: { "x-client": `aethon-beacon-entitlements/${Platform.OS}` }
      }
    });
  }
  return client;
}

const VALID_STATUSES: EntitlementStatus[] = [
  "active",
  "grace_period",
  "billing_issue",
  "cancelled",
  "expired",
  "none"
];

function normalizeStatus(value: unknown): EntitlementStatus {
  return typeof value === "string" && (VALID_STATUSES as string[]).includes(value)
    ? (value as EntitlementStatus)
    : "none";
}

function rowToEntitlement(row: EntitlementRow): Entitlement {
  return {
    userId: row.user_id,
    productId: row.product_id,
    entitlementId: row.entitlement_id,
    status: normalizeStatus(row.status),
    store: row.store,
    willRenew: row.will_renew ?? false,
    expiresAt: row.expires_at,
    updatedAt: row.updated_at
  };
}

/**
 * Access decision. Deliberately NOT a simple status-in-list check: RevenueCat's
 * own guidance is to only revoke access on an EXPIRATION event, specifically
 * *not* on cancellation ("this event fires when a user unsubscribes, not when
 * the subscription expires" -- they keep what they already paid for through
 * the end of the current period). So "cancelled" and "billing_issue" still
 * grant access as long as expiresAt hasn't actually passed yet; only
 * "expired" and "none" (or a past expiresAt) revoke it. This also means a
 * missed webhook can never grant access past its real expiration, since the
 * date check is the backstop regardless of what status happens to be stored.
 */
export function hasPremiumAccess(entitlement: Entitlement | null | undefined, now: Date = new Date()): boolean {
  if (!entitlement) return false;
  if (entitlement.status === "expired" || entitlement.status === "none") return false;
  if (entitlement.expiresAt) {
    return new Date(entitlement.expiresAt).getTime() > now.getTime();
  }
  // No expiresAt at all (e.g. a non-expiring/lifetime product) -- fall back
  // to trusting the stored status since there's no date to check against.
  return true;
}

/**
 * One-shot fetch, e.g. on app launch before the realtime subscription has
 * had a chance to receive anything.
 */
export async function fetchEntitlement(
  userId: string
): Promise<{ ok: boolean; entitlement: Entitlement | null; error?: string }> {
  const supabase = getClient();
  if (!supabase) return { ok: false, entitlement: null, error: "Supabase not configured" };
  if (!userId) return { ok: false, entitlement: null, error: "userId is required" };

  const { data, error } = await supabase
    .from("aethon_entitlements")
    .select("user_id, product_id, entitlement_id, status, store, will_renew, expires_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { ok: false, entitlement: null, error: error.message };
  if (!data) return { ok: true, entitlement: null };

  return { ok: true, entitlement: rowToEntitlement(data as EntitlementRow) };
}

/**
 * Realtime subscription scoped to exactly one person's row (via a Postgres
 * filter, not a client-side check -- Supabase only ships matching rows over
 * the wire). This is what makes a renewal on the phone show up on another
 * open device/tab within seconds instead of waiting for the next app launch
 * or a manual refresh.
 */
export function subscribeEntitlement({
  userId,
  onChange,
  onStatus,
  onError
}: {
  userId: string;
  onChange: (entitlement: Entitlement | null) => void;
  onStatus?: (status: string) => void;
  onError?: (message: string) => void;
}): { unsubscribe: () => void } {
  const supabase = getClient();
  if (!supabase || !userId) {
    onStatus?.("local");
    return { unsubscribe: () => undefined };
  }

  let channel: RealtimeChannel | null = supabase
    .channel(`aethon-entitlement-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "aethon_entitlements",
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        if (payload.eventType === "DELETE") {
          onChange(null);
          return;
        }
        onChange(rowToEntitlement(payload.new as EntitlementRow));
      }
    )
    .subscribe((status, error) => {
      onStatus?.(status);
      if (error) onError?.(error.message);
    });

  return {
    unsubscribe: () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => undefined);
        channel = null;
      }
    }
  };
}
