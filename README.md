# NAYIQ

NAYIQ is a cross-platform wellbeing and guidance app built with Expo and
React Native. One codebase ships to **Android, iOS, and web**. It combines a
private counselling/guidance engine, a formal grievance-redress toolkit, a real
sidereal Vedic astrology engine (English + Hindi), and calming tools (tones,
meditation, journaling).

- **App version:** 1.0.4  ·  **Bundle ID:** `com.aethonbeacon.app`
- **Expo SDK:** ~56  ·  **React Native:** 0.85.3  ·  **React:** 19  ·  **Node:** ≥ 22.13

## Documentation

Full documentation lives in [`docs/`](./docs/README.md):

| Doc | For |
|---|---|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Developers — stack, layout, the two engines, bilingual system, quality gates, build/deploy |
| [USER_GUIDE.md](./docs/USER_GUIDE.md) | End users — every tab and feature |
| [STORE_LISTING.md](./docs/STORE_LISTING.md) | Play/App Store copy, release notes, assets |
| [PRIVACY_AND_COMPLIANCE.md](./docs/PRIVACY_AND_COMPLIANCE.md) | Privacy policy + store disclosure answers |

Operational runbooks (tester setup, entitlements, Supabase realtime,
auto-publish) are the `*.md` files at the repository root.

## What's included

- Full app source in `App.tsx` (single-file architecture — see ARCHITECTURE.md).
- Android/iOS/web config in `app.json`; EAS build profiles in `eas.json`.
- Local-first journaling and check-ins via AsyncStorage (no account required).
- **Counselling engine** — adaptive two-way chat that builds a personalised
  reflection + journey from your real history (never fabricated).
- **Vedic insight system** — real sidereal astronomy: multi-dimensional Moon-chart reading,
  Dasha timeline + 15-year forecast, Yogas/Ashtakavarga/Shadbala, and a bilingual
  "Ask the chart" flow (English + Hindi).
- **Tones** — Pristine Tone Engine with a hearing-safety limiter, session
  presets, and a persistent background mini-player.
- **Meditation & Calm** — breathing guides, reset timer, situation-matched routines.
- **Help & Redress** — SOS, verified helplines, complaint templates, evidence
  checklists, and first-office routing.
- **Community** — moderated feed + verified private chat (Supabase realtime).
- **Patterns** — weekly/monthly trends and a supportive progress report.
- Identity profiles, onboarding, daily reminders, local backup export, and a
  gated admin panel.

## Quality gates

Run before every commit:

```bash
pnpm run typecheck            # tsc --noEmit — must be clean
pnpm run test:tone            # tone engine
pnpm run test:vedic           # Vedic insight system (incl. bilingual)
pnpm run test:visibility      # contrast + design-system tokens
pnpm run test:product-quality # navigation, safeguards, redress governance
pnpm run test:upgrades        # feature markers + personalization wiring
```

These literal-assertion suites are the module boundary this single-file app
lacks: any UI string or function-signature change must update its matching
assertion in the same commit.

## Local setup

Requires Node ≥ 22.13 and `pnpm`.

```bash
pnpm install
pnpm run web        # web preview
pnpm run android    # Android (device/emulator; use a dev client for reminders)
pnpm run ios        # iOS (simulator/device)
```

For Android development builds, set `JAVA_HOME` (JDK 17) and `ANDROID_HOME`
before running `pnpm run run:android`.

## Build & deploy

- **Mobile:** `npx eas build --platform android|ios` using `eas.json`. Android
  publishes to the Play closed-testing (Alpha) track via CI.
- **Web:** `pnpm run export:web` builds a static bundle to `dist/`. Because
  GitHub Actions minutes are capped, deploy with the local mirror script:
  ```bash
  git push origin master && ./scripts/manual-render-deploy.sh
  ```
- **Verification backend (OTP):** deployed on Render via `render.yaml`
  (`scripts/verification-server.mjs`). Set
  `EXPO_PUBLIC_VERIFICATION_API_BASE_URL` in the app build.
- **Release preflight:** `pnpm run release:check` validates version/runtime
  alignment, the configured privacy URL, and the bundled privacy artifacts.
  `pnpm run verification:env-check` must also pass in the production
  environment before public OTP-enabled release.

## Launch status

- Feature-complete for beta / soft launch.
- **Free for the first year:** feature gating / paywall is intentionally deferred
  (purchase plumbing exists in `purchases.ts`, no paywall UI wired).
- Before public launch: deploy and verify
  `https://aethon-beacon-web.onrender.com/privacy-policy.html` serves the
  bundled policy (the `nayiq.co` DNS currently does not resolve), configure at
  least one live OTP delivery lane (SMS or email) in the verification service,
  and confirm the publisher/support details in the store and privacy docs.

## Not medical care

NAYIQ is a supportive wellbeing tool — not a medical device, diagnosis,
or a substitute for professional or emergency care.
