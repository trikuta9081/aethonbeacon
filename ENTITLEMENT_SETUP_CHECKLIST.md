# Premium entitlement setup checklist

What's already built (2026-08-07) vs. what only you can do, since it requires
accounts and store listings I can't create on your behalf.

## Already done (code, inert until you complete the steps below)

- `supabase_entitlements_schema.sql` — the `aethon_entitlements` table. **Not yet run against your Supabase project.**
- `entitlements.ts` — reads the table, subscribes to Realtime, `hasPremiumAccess()`.
- `purchases.ts` — RevenueCat SDK wrapper (`configurePurchasesAndLogIn`, `restorePurchases`, `fetchCurrentOffering`, `purchasePackage`). No-ops until the package is installed and API keys are set.
- `scripts/verification-server.mjs` — `POST /webhooks/revenuecat` route on the `aethon-beacon-verification` Render service. Verifies either the Authorization header or HMAC signature, maps RevenueCat event types to entitlement status, upserts to Supabase, with an ordering guard against out-of-order retries.
- `render.yaml` — four new env var slots on `aethon-beacon-verification` (all `sync: false`, meaning Render will prompt you to fill them in): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `REVENUECAT_WEBHOOK_AUTH_HEADER`, `REVENUECAT_WEBHOOK_SIGNING_SECRET`.
- `App.tsx` — subscribes to the signed-in person's entitlement row the moment phone/email verification completes, exposes `isPremium` in component state. **Nothing in the UI reads `isPremium` yet** — see "Gating" section below for why.

## Known gap

`TRANSFER` and `SUBSCRIBER_ALIAS` RevenueCat events (someone's purchase moving between App User IDs, e.g. reinstall-then-restore-under-a-different-identity edge cases) are intentionally not handled yet — the webhook acknowledges them with 200 but doesn't update the table. Low priority unless you see support tickets about a "lost" purchase after a reinstall.

## Steps only you can do

### 1. Supabase
1. Open your existing Supabase project (same one behind `EXPO_PUBLIC_SUPABASE_URL`).
2. SQL Editor → paste and run `supabase_entitlements_schema.sql`.
3. Settings → API → copy the **service_role** key (not anon) — you'll need it in step 4.

### 2. RevenueCat account
1. Sign up at revenuecat.com, create a project called "Aethon Beacon."
2. You'll link this to App Store Connect and Play Console in the next two steps — RevenueCat's dashboard walks you through both once you have store-side products (steps 3–4).

### 3. App Store Connect
1. App → Monetization → Subscriptions → create a subscription group (e.g. "Aethon Beacon Premium").
2. Add products for whatever you actually want to sell — the 4 items already described in Settings are: extended Moon-chart reports, long-form counselling programmes, advanced audio programmes, encrypted multi-device backup. You can bundle them into one subscription or split them; that's a pricing decision, not a technical one.
3. In RevenueCat: Project settings → Apps → connect the App Store Connect app, generate an App Store Connect API key if prompted.

### 4. Play Console
1. Monetize → Products → Subscriptions → create matching subscription product(s).
2. In RevenueCat: Project settings → Apps → connect the Play Console app (needs a Play Console service account JSON, similar to the one already used for `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` in CI, but this one lives in RevenueCat's dashboard, not GitHub Actions).

### 5. RevenueCat webhook
1. RevenueCat dashboard → Integrations → Webhooks → Add new configuration.
2. URL: `https://aethon-beacon-verification.onrender.com/webhooks/revenuecat`
3. Set an Authorization header value (any secret string you choose) — copy the same value into Render's `REVENUECAT_WEBHOOK_AUTH_HEADER`.
4. Optional but recommended: toggle HMAC webhook signing, copy the shown-once secret into Render's `REVENUECAT_WEBHOOK_SIGNING_SECRET`.
5. Send events for both sandbox and production while you're testing.

### 6. Render env vars
On the `aethon-beacon-verification` service (not `aethon-beacon-web`):
- `SUPABASE_URL` — your Supabase project URL (same value as `EXPO_PUBLIC_SUPABASE_URL`).
- `SUPABASE_SERVICE_ROLE_KEY` — from step 1.3. **Never put this in the app or give it the `EXPO_PUBLIC_` prefix.**
- `REVENUECAT_WEBHOOK_AUTH_HEADER` — from step 5.3.
- `REVENUECAT_WEBHOOK_SIGNING_SECRET` — from step 5.4, if enabled.

After saving, redeploy the service and check `/health` — it should report `providers.revenueCatWebhook: true`.

### 7. App-side SDK
1. `pnpm add react-native-purchases` (I didn't pin a version myself — couldn't verify the current release from here, and a guessed pin would be worse than you just installing latest).
2. Get your RevenueCat **public** API keys (Project settings → API keys — separate ones for iOS and Android, different from the service-role/secret keys above).
3. Add to your env: `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` (same places `EXPO_PUBLIC_SUPABASE_URL` already lives: local `.env`, `build-android.yml`, `build-ios.yml`, `render.yaml`'s web service if the web build also needs it).
4. Rebuild — `configurePurchasesAndLogIn` in `purchases.ts` picks these up automatically once set; no other code change needed for the SDK to start tracking real purchases.

### 8. Test end-to-end
1. RevenueCat dashboard → your webhook integration → "Send test event" — confirm it lands in Supabase's `aethon_entitlements` table.
2. Make a real sandbox purchase (TestFlight sandbox account / Play Console license tester) and confirm the row updates and the app's `isPremium` flips within a few seconds on a second device signed into the same phone/email.

## Gating — deliberately not built yet

Settings currently shows: *"Every feature is fully unlocked for at least one year. No trial, no paywall, no hidden limits."* Confirmed with you on 2026-08-07: keep this infrastructure ready but don't add any lock/paywall UI to the 4 premium features until that promise's window is actually ending.

When you're ready to flip this on, the work is:
1. Decide final pricing/bundling for the 4 features (or a different final feature set).
2. Update or remove the Settings banner (`App.tsx`, search `FREE ACCESS BANNER`) so the UI stops promising something no longer true.
3. Add a small `PremiumGate`-style check at each of the 4 feature entry points, reading `isPremium` (already computed in `App.tsx`'s top-level state) and rendering an upsell/paywall instead of the feature when false.
4. Build the actual paywall screen using `fetchCurrentOffering()` / `purchasePackage()` from `purchases.ts` (both already written, just not called from anywhere yet).
5. Add a "Restore purchases" button somewhere in Settings (`restorePurchases()` in `purchases.ts`) — required by both App Store and Play Store review guidelines for any app selling subscriptions.
