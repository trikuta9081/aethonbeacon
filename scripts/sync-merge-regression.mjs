// Cross-device sync merge rules. Run with:  node --experimental-strip-types
//
// The previous sync implementation reported success while transferring nothing,
// so these cases exist to keep the replacement honest about the one thing that
// matters: no device silently loses a user's writing.

import { LIST_FIELDS, LOCAL_ONLY_FIELDS, mergeById, mergeField, recordTime } from "../syncMerge.ts";

let checks = 0;
function assert(condition, message) {
  checks += 1;
  if (!condition) throw new Error(message);
}
function equal(actual, expected, message) {
  assert(JSON.stringify(actual) === JSON.stringify(expected),
    `${message}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
}

const msg = (id, at, text) => ({ id, updatedAt: at, text });

// ── Rule 1: local untouched since last sync -> remote wins ──────────────────
equal(
  mergeField({ field: "profileName", localValue: "Raj", baseValue: "Raj",
    remoteValue: "Rajeshwar", remoteUpdatedAt: 200, lastSyncedAt: 100 }),
  { value: "Rajeshwar", changed: true },
  "A field this device has not touched must accept the other device's value"
);

// ── Rule 2: remote unchanged -> local kept, nothing marked dirty ────────────
equal(
  mergeField({ field: "profileName", localValue: "Raj B", baseValue: "Raj",
    remoteValue: "Raj", remoteUpdatedAt: 200, lastSyncedAt: 100 }),
  { value: "Raj B", changed: false },
  "An unchanged remote value must never clobber a local edit"
);

// ── Rule 3: the case the old code got fatally wrong ─────────────────────────
// Two devices each added a counselling message. Both must survive.
{
  const base = [msg("a", 1, "first")];
  const local = [msg("a", 1, "first"), msg("b", 3, "typed on phone")];
  const remote = [msg("a", 1, "first"), msg("c", 2, "typed on tablet")];
  const { value } = mergeField({ field: "aiHelpMessages", localValue: local, baseValue: base,
    remoteValue: remote, remoteUpdatedAt: 500, lastSyncedAt: 100 });
  equal(value.map((m) => m.id), ["a", "c", "b"],
    "Concurrent messages from two devices must both survive, ordered by time");
}

// ── Rule 4: same record edited on both -> newer copy wins, no duplicate ─────
{
  const { value } = mergeField({
    field: "entries",
    localValue: [msg("x", 10, "local edit")],
    baseValue: [msg("x", 1, "original")],
    remoteValue: [msg("x", 20, "remote edit")],
    remoteUpdatedAt: 500, lastSyncedAt: 100
  });
  equal(value, [msg("x", 20, "remote edit")], "The newer copy of a record wins and is not duplicated");
}

// ── Rule 5: a scalar edited on both sides keeps what the user can see ───────
equal(
  mergeField({ field: "profileName", localValue: "local", baseValue: "base",
    remoteValue: "remote", remoteUpdatedAt: 50, lastSyncedAt: 100 }).value,
  "local",
  "A stale remote scalar must not overwrite a newer local edit"
);
equal(
  mergeField({ field: "profileName", localValue: "local", baseValue: "base",
    remoteValue: "remote", remoteUpdatedAt: 150, lastSyncedAt: 100 }).value,
  "remote",
  "A genuinely newer remote scalar is taken"
);

// ── Rule 6: device-local fields never move ─────────────────────────────────
for (const field of ["adminSessionToken", "adminUnlockFailures", "adminLockedUntilAt"]) {
  equal(
    mergeField({ field, localValue: "mine", baseValue: "base",
      remoteValue: "theirs", remoteUpdatedAt: 999, lastSyncedAt: 0 }),
    { value: "mine", changed: false },
    `${field} must never be accepted from another device`
  );
}
assert(LOCAL_ONLY_FIELDS.has("adminSessionToken"), "Admin session material must be local-only");
assert(!LIST_FIELDS.adminSessionToken, "Admin session material must not be list-merged");

// ── Rule 7: caps trim the oldest, never the newest ─────────────────────────
{
  const many = Array.from({ length: 30 }, (_, i) => msg(`m${i}`, i, `m${i}`));
  const merged = mergeById([], many, "id", 10);
  equal(merged.length, 10, "A capped field is trimmed to its cap");
  equal(merged[merged.length - 1].id, "m29", "Capping keeps the newest records");
  equal(merged[0].id, "m20", "Capping drops the oldest records");
}

// ── Rule 8: malformed data must not throw or drop everything ───────────────
equal(mergeById(null, [msg("a", 1, "x")], "id"), [msg("a", 1, "x")], "A missing local list falls back to remote");
equal(mergeById([msg("a", 1, "x")], null, "id"), [msg("a", 1, "x")], "A missing remote list keeps local");
{
  const withJunk = mergeById([{ noId: true }], [msg("a", 1, "x")], "id");
  equal(withJunk.length, 2, "Records without an id are kept rather than silently dropped");
}
equal(recordTime({ createdAt: "2026-08-29T00:00:00Z" }), Date.parse("2026-08-29T00:00:00Z"),
  "recordTime reads ISO createdAt");
equal(recordTime({}), 0, "recordTime is 0 for an untimestamped record");
equal(recordTime("not an object"), 0, "recordTime tolerates non-objects");

// ── Rule 9: counselling, journal and tone history are actually in scope ────
for (const field of ["aiHelpMessages", "entries", "calmSessions", "communityChatMessages", "redressCases"]) {
  assert(LIST_FIELDS[field], `${field} must be list-merged so its history is retained across devices`);
}

console.log(`Sync merge regression passed: ${checks} checks across remote-wins, local-wins, concurrent list merge, per-record recency, scalar conflict, device-local isolation, retention caps and malformed input.`);
