/**
 * syncMerge.ts — the pure half of cross-device sync.
 *
 * Kept free of react-native and supabase imports so the merge rules can be
 * exercised directly by scripts/sync-merge-regression.mjs. Everything here is
 * deterministic: same inputs, same output, no I/O.
 */

export type Payload = Record<string, unknown>;

/** Fields that are lists of identified records, and the property holding the id. */
export const LIST_FIELDS: Record<string, string> = {
  entries: "id",
  aiHelpMessages: "id",
  communityMessages: "id",
  communityChatMessages: "id",
  privateSpaceThreads: "id",
  redressCases: "id",
  visitReports: "id",
  communityReports: "id",
  calmSessions: "id",
  userReviews: "id",
  trustedContacts: "id"
};

/**
 * Device-local fields. Admin session material, unlock counters and single-device
 * bookkeeping must never travel between devices.
 */
export const LOCAL_ONLY_FIELDS = new Set<string>([
  "adminAccessCode",
  "adminAccessAttempt",
  "adminAccessNameAttempt",
  "adminUnlockFailures",
  "adminLockedUntilAt",
  "adminSessionToken",
  "adminSessionExpiresAt",
  "securityCheckLastRun",
  "appLastHeartbeatAt",
  "localProductMetrics",
  "dismissedHintTabs"
]);

/** Upper bounds so one field cannot grow without limit in the sync table. */
export const FIELD_CAPS: Record<string, number> = {
  entries: 200,
  aiHelpMessages: 400,
  communityMessages: 200,
  communityChatMessages: 200,
  calmSessions: 120,
  visitReports: 100,
  communityReports: 100,
  userReviews: 20
};

export function same(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  } catch {
    return false;
  }
}

/** Best-effort timestamp for a record, used to pick the newer of two copies. */
export function recordTime(item: unknown): number {
  if (!item || typeof item !== "object") return 0;
  const record = item as Record<string, unknown>;
  for (const field of ["updatedAt", "createdAt", "at", "timestamp", "date"]) {
    const value = record[field];
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

/** Union two record lists by id, keeping the newer copy of each id. */
export function mergeById(local: unknown, remote: unknown, idKey: string, cap?: number): unknown {
  if (!Array.isArray(local)) return Array.isArray(remote) ? remote : local;
  if (!Array.isArray(remote)) return local;

  const byId = new Map<string, unknown>();
  const anonymous: unknown[] = [];

  for (const item of [...remote, ...local]) {
    const id = item && typeof item === "object" ? (item as Record<string, unknown>)[idKey] : undefined;
    if (typeof id !== "string" && typeof id !== "number") {
      anonymous.push(item);
      continue;
    }
    const key = String(id);
    const existing = byId.get(key);
    if (existing === undefined || recordTime(item) >= recordTime(existing)) {
      byId.set(key, item);
    }
  }

  const merged = [...byId.values(), ...anonymous].sort((a, b) => recordTime(a) - recordTime(b));
  return typeof cap === "number" && merged.length > cap ? merged.slice(-cap) : merged;
}

export function capped(field: string, value: unknown): unknown {
  const cap = FIELD_CAPS[field];
  if (typeof cap === "number" && Array.isArray(value) && value.length > cap) {
    return value.slice(-cap);
  }
  return value;
}

/**
 * Decide one field's value from the three-way comparison.
 *
 *   local unchanged since last sync  -> take remote
 *   remote unchanged since last sync -> keep local
 *   both changed, list of records    -> union by id, newer copy per id
 *   both changed, anything else      -> remote only if strictly newer than
 *                                       this device's last successful sync
 */
export function mergeField(args: {
  field: string;
  localValue: unknown;
  baseValue: unknown;
  remoteValue: unknown;
  remoteUpdatedAt: number;
  lastSyncedAt: number;
}): { value: unknown; changed: boolean } {
  const { field, localValue, baseValue, remoteValue, remoteUpdatedAt, lastSyncedAt } = args;

  if (LOCAL_ONLY_FIELDS.has(field)) return { value: localValue, changed: false };

  const localChanged = !same(localValue, baseValue);
  const remoteChanged = !same(remoteValue, baseValue);
  if (!remoteChanged) return { value: localValue, changed: false };

  let next: unknown;
  if (!localChanged) {
    next = remoteValue;
  } else if (LIST_FIELDS[field]) {
    next = mergeById(localValue, remoteValue, LIST_FIELDS[field], FIELD_CAPS[field]);
  } else {
    next = remoteUpdatedAt > lastSyncedAt ? remoteValue : localValue;
  }

  return { value: next, changed: !same(next, localValue) };
}
