# NAYIQ — Privacy & Compliance

This document covers the privacy policy, the data-handling summary, and the
store disclosure answers (Google Play Data Safety and Apple App Privacy). It is
written to match what the app actually does, per `app.json` and the code. A
plain-HTML version for hosting lives in `privacy-policy.html`.

_Effective for app version 1.0.4. The publisher label and support address below
must match the final store-account details before publishing._

---

## 1. Privacy policy

**Who we are.** NAYIQ ("the app", "we") is a wellbeing and guidance app
published by Trikuta. Contact: [trikuta9081@gmail.com](mailto:trikuta9081@gmail.com).

**Our approach.** NAYIQ is local-first. The core features — journaling,
check-ins, guidance, counselling, tones, meditation, and the Vedic chart — run
on your device and do not require an account. We do not track you across other
apps or websites, and we do not sell your data.

**What is stored on your device.** Your journal entries, check-ins, mood
history, profile/identity choice, reminder settings, emergency number, and
saved guidance are stored locally using on-device storage. You can export a
local backup and delete the app to remove this data.

**What is sent off your device — only if you opt in.**
- **Verification (OTP):** if you choose to verify a phone number or email (to
  unlock community chat/messaging), that identifier is sent to our verification
  backend to send and check a one-time code.
- **Community:** if you post or message in Community, that content and your
  verified identity are stored on our backend (Supabase) so others can see
  moderated posts and you can chat. Community content is moderated; offensive
  and adult content is blocked.
- **Entitlements/purchases:** if in-app purchases are ever enabled, purchase
  status is processed via the app store and our entitlement service. (Purchases
  are disabled in the current free-launch release.)
- **Optional connected guidance enrichment:** if configured, an optional connected guidance service may generate
  additional guidance text from the words you share in counselling, journal
  insights, weekly pattern notes, or exact birth details for a chart enrichment.
  This is disabled while Local-only mode is on. The offline guidance always works
  without it.

**Permissions we request (and why).**
- **Microphone** — only when you choose voice input for guidance or journaling.
- **Speech recognition** — to transcribe your voice input into text on supported
  devices.
- **Face ID / device biometrics** — optional, to protect your data if you enable it.
- **Notifications** — for the daily reminders you opt into.

**Permissions we do NOT use:** camera, photo library, contacts, and location are
**not** accessed. We do not use advertising identifiers and do not track across
apps (`NSUserTrackingUsageDescription` states no tracking).

**Children.** NAYIQ is intended for teen and adult users and is not
directed at children under 13. Do not use community features if you are under
the minimum age in your region.

**Your rights.** You can delete local data by removing the app. For data held on
our backend (verification identifier, community content), contact
[trikuta9081@gmail.com](mailto:trikuta9081@gmail.com) to request access or deletion.

**Not medical care.** NAYIQ is a supportive wellbeing tool. It is not a
medical device, diagnosis, or a substitute for professional or emergency care.

**Changes.** We will update this policy as the app evolves and note the effective
version at the top.

---

## 2. Data-handling summary (quick reference)

| Data | Stored where | Sent off device? | Purpose |
|---|---|---|---|
| Journal / check-ins / mood | Device (local) | No | Personal reflection, trends |
| Profile / identity / settings | Device (local) | No | Personalisation |
| Emergency number | Device (local) | No | SOS calling |
| Phone/email (verification) | Backend, if you verify | Yes (opt-in) | OTP verification |
| Community posts / messages | Backend, if you post | Yes (opt-in) | Moderated community |
| Connected guidance text / birth details | Guidance provider, if you explicitly use connected enrichment and Local-only is off | Yes (opt-in) | Optional written guidance |
| Voice input | Processed on device / OS speech | OS-dependent | Transcription |
| Purchase status | App store / entitlement svc | Only if IAP enabled | Entitlements (disabled now) |

No advertising ID. No cross-app tracking. No location, camera, contacts, or
photo access.

---

## 3. Google Play — Data Safety form answers

- **Does your app collect or share user data?** Yes (only opt-in verification &
  community data). Core features collect none.
- **Data types collected (only when the user opts in):**
  - *Personal info:* Email address and/or phone number — collected **only** for
    account verification; not shared with third parties; user can request
    deletion. Processing purpose: Account management / fraud prevention.
  - *Messages / User content:* Community posts and chat — collected when the user
    posts; visible to other users as moderated content.
- **Data collected by core features (journal, mood, chart):** stored **on-device
  only** → declare as *not collected* (not transmitted off device).
- **Is data encrypted in transit?** Yes (HTTPS/TLS to the backend).
- **Can users request data deletion?** Yes — provide the support contact.
- **Is data shared with third parties?** No (aside from the app store for any
  future purchases).
- **Does the app use advertising IDs?** No.

## 4. Apple — App Privacy ("nutrition label")

- **Data Not Collected** applies to the core on-device features.
- **Data Linked to You (opt-in only):**
  - Contact Info → Email/Phone → *App Functionality* (verification).
  - User Content → Community posts/messages → *App Functionality*.
- **Tracking:** None. Do **not** enable App Tracking Transparency prompts for
  advertising; `NSUserTrackingUsageDescription` explicitly states no tracking.
- **Privacy manifest:** `app.json` declares `NSPrivacyAccessedAPICategoryUserDefaults`
  with reason `CA92.1` (accessing user defaults to store app settings).

## 5. Pre-submission compliance checklist

- [ ] Verify that `https://aethon-beacon-web.onrender.com/privacy-policy.html` serves the current
      `public/privacy-policy.html` file; put that URL in both store listings.
- [ ] Confirm that `Trikuta` is the correct legal/developer name and that
      `trikuta9081@gmail.com` is monitored for privacy and deletion requests.
- [ ] Run `pnpm run verification:env-check` in the production environment and
      confirm at least one non-debug OTP delivery lane is configured.
- [ ] Confirm Data Safety / App Privacy answers match this doc.
- [ ] Content rating questionnaires completed (Teen/12+; moderated UGC).
- [ ] Encryption: `ITSAppUsesNonExemptEncryption` is set to `false` in
      `app.json` (standard HTTPS only) — confirm this stays true.
- [ ] Do **not** declare IAP until the paywall is enabled.
- [ ] Crisis/medical disclaimer present in-app and in the listing.
