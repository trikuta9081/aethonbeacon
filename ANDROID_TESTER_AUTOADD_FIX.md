# Android tester auto-add — status and fix procedure

Last updated: 2026-07-30

## Current state (verified 2026-07-30)

- **iOS (TestFlight): auto-add is live.** App Store Connect "All Testers" reports **38 testers** in the `NAYIQ External TestFlight` group (id `33754363-e559-4dce-ad22-bf6c1f043fac`). Most were added on 2026-07-23 by the server's `addIosTesterToTestFlight()` path in `scripts/static-server.mjs`. The form on `https://nayiq.co/testers` submits to `/api/tester-request`, which calls the App Store Connect API and immediately adds + invites the Apple ID.
- **Android (Play Console closed testing): auto-add is NOT possible with the current allowlist configuration.** The Play Console dashboard reports **4 testers currently opted in** — unchanged from the 2026-07-23 baseline, seven days after the outreach push to 47 Gmail addresses. Only the 4 people who already were in a list before that push have opted in; no new opt-ins have landed.

## Why Android auto-add is broken

On 2026-07-23 the Alpha track's tester audience was switched from a **Google Group** to **three Play Console "Email lists"**:

- `NAYIQ Android Testers` (31 users)
- `NAYIQ Internal Testers` (1 user)
- `NAYIQ Testers` (15 users)

The server code documents this in `scripts/static-server.mjs` around line 236:

> Play Console's closed-testing tester allowlist for this app now uses "Email lists" instead of a Google Group. The Android Publisher API has no endpoint to add/remove members from those Play Console email lists, so there is no way to grant Play Store access [programmatically]… every new Gmail must be added to a Play Console list by hand.

This is factually correct: Google's Android Publisher API (`androidpublisher.googleapis.com`) exposes track configuration, releases, in-app purchases, and reviews — but no endpoint for the tester email-list resource. The list can only be edited in the Play Console UI or by CSV upload. As a result, every Android submission through the web form is currently only:

1. Appended to `/tmp/aethon-tester-requests.ndjson` on the server.
2. Emailed to `slathiarimple567@gmail.com` (if SendGrid env vars are set).
3. Returned to the tester with the message "Your Gmail will be added by hand, usually within 24 hours."

If no one runs step (3) manually, the dashboard sits at 4/12 forever.

## Three viable fixes, ranked

### Option A — Auto-sync via Claude in Chrome (RECOMMENDED — implemented today)

This is the closest thing to iOS-parity that Google's API restrictions allow. Two new endpoints on the web server plus a scheduled task file:

**Server side (already committed to `scripts/static-server.mjs`):**

- `GET /api/pending-android-testers?token=<TESTER_SYNC_TOKEN>` — returns Android Gmails from the requests log that have not yet been pasted into Play Console. Bearer-token or query-param auth, constant-time compare.
- `POST /api/mark-testers-synced?token=<TESTER_SYNC_TOKEN>` — records which Gmails were added, so the same address never gets pasted twice.

**Scheduled task (`scheduled-tasks/android-tester-auto-sync.md`):**

On every scheduled run, the task fetches the pending list; if any, opens the Alpha track → Testers tab in Play Console via Claude in Chrome, clicks the → arrow next to *NAYIQ Android Testers*, pastes the comma-separated Gmails, presses Enter, clicks Save, then POSTs the emails to `/api/mark-testers-synced` so they don't get re-added.

From the tester's point of view this is indistinguishable from iOS: submit the form, get added — the delay is just the scheduled-task cadence you set (recommend every 30 or 60 minutes). Set `TESTER_SYNC_TOKEN` on the server, paste the same value into the task file, and schedule it via `/schedule`.

**Backup: manual CSV sweep helper.** `scripts/tester-request-sweep.mjs` still ships alongside for the case where you want to add emails without waiting for a scheduled run — reads the log, produces `outputs/android-testers-to-add.txt` and `.csv`.

### Option B — Revert audience back to a Google Group

Restores the full automation you already have in `addAndroidTesterToGoogleGroup()`. Every form submission gets `POST`ed to `admin.googleapis.com/admin/directory/v1/groups/…/members` and the tester becomes eligible instantly.

**Important prerequisite:** the Directory API `groups.members.insert` endpoint requires **Google Workspace**. A personal `@gmail.com` account cannot use it. If `slathiarimple567@gmail.com` is a personal Gmail (not a Workspace domain), Option B will not work as-is and Option A is your best path. If you're on Workspace, follow the steps below.

Steps in Play Console:

1. Open Play Console → NAYIQ → **Testing → Closed testing → Alpha → Testers** tab.
2. Under "Manage testers" change **Audience** from *Email lists* to *Google Groups*.
3. Enter the group email (e.g. `aethon-beacon-testers@googlegroups.com`) and Save.

Steps in Google Cloud + Workspace admin:

1. Create a service account key with the Directory API scope `https://www.googleapis.com/auth/admin.directory.group.member`.
2. In Google Workspace Admin → Security → API Controls → **Domain-wide Delegation**, add the service account with that scope.
3. Add the service account as a **Manager** of the Google Group.

Steps in server env:

1. Set `GOOGLE_TESTER_GROUP_EMAIL` to the group's address.
2. Set `GOOGLE_GROUP_SERVICE_ACCOUNT_JSON` to the entire JSON key file contents (single line).
3. Redeploy the server. `addAndroidTesterToGoogleGroup()` starts adding automatically.

### Option C — Public open-testing link

Not for closed testing. If you switch the track type from *Closed* to *Open*, Play publishes a public opt-in URL and anyone with the link can join, no allowlist needed. But this changes the release from beta to public beta — different reviewer criteria — and forfeits the closed-test → production-access gate you're already 4/12 of the way through. Not recommended right now.

## Recommendation

Ship **Option A** today. It's the honest iOS-parity path given Google's API restrictions: the tester experiences a "submit form → get added" flow, with the only latency being the scheduled-task cadence. Option B is only worth the effort if you're already on Google Workspace and want true real-time adds.

## Verification checklist after either fix

- Submit a fresh Gmail through `https://nayiq.co/testers`.
- Confirm within a few minutes that the same Gmail appears in the target email list (A) or Google Group (B).
- Watch the Play Console dashboard "N testers currently opted-in" line — it should tick upward within 24 hours as those Gmails click the opt-in link.
