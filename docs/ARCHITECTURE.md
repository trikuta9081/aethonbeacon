# Aethon Beacon — Architecture & Developer Guide

_Last updated for app version 1.0.4 (iOS build 54)._

Aethon Beacon is a cross-platform wellbeing app that combines a private
counselling/guidance engine, a formal grievance-redress toolkit, an
astrology (Vedic Jyotish) engine, and a set of calming tools (tones,
meditation, journaling). One Expo/React Native codebase ships to Android,
iOS, and web.

---

## 1. Tech stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK ~56, React Native 0.85.3, React 19 |
| Language | TypeScript (strict), `tsc --noEmit` as the type gate |
| Web | `react-native-web` (same source, exported static bundle) |
| Local storage | `@react-native-async-storage/async-storage` (local-first) |
| Backend (optional) | Supabase (`@supabase/supabase-js`) for auth/OTP, entitlements, community |
| Purchases | `react-native-purchases` plumbing via `purchases.ts` (RevenueCat) |
| Astronomy | `astronomy-engine` for real sidereal calculations |
| Audio | `expo-audio` + a WebAudio continuous-tone engine on web |
| Voice | `expo-speech` (TTS) + `expo-speech-recognition` (STT) |
| Notifications | `expo-notifications` (daily reminders, mobile only) |

Node ≥ 22.13 is required (Expo 56). The package manager is `pnpm`.

---

## 2. Repository layout (essentials)

```
App.tsx                     # The entire app UI + logic (single file, ~46k lines)
app.json                    # Expo config: name, version, bundle IDs, permissions, privacy manifest
eas.json                    # EAS build profiles
purchases.ts                # RevenueCat entitlement plumbing
entitlements.ts             # Entitlement data model
notifications.ts            # Reminder scheduling helpers
supabaseSync.ts             # Supabase client + sync
realtimeCommunity.ts        # Community realtime subscription
scripts/                    # Regression suites, build helpers, verification server, deploy
  *-regression.mjs          # 5 literal-assertion test suites (see §6)
  manual-render-deploy.sh   # Local web deploy (bypasses GitHub Actions)
  verification-server.mjs   # Local OTP/verification bridge for beta
assets/                     # Icons, splash, tone WAV, fonts
docs/                       # This documentation set
supabase_*.sql              # Community + entitlement DB schemas
```

### Why one big `App.tsx`?

The app grew as a single-file monolith. It is intentionally kept that way for
now: there is no `src/` tree. Components (`BirthChartSection`,
`CounselingChatModal`, `ToneLibrarySection`, `CommunitySection`,
`RedressSection`, `InsightsSection`, etc.) are all defined in `App.tsx`, with
the root `App()` holding hundreds of `useState`/`useMemo` hooks and passing
state down as props. The regression suites (§6) exist precisely because a
single file this large has no module boundaries to lean on — they assert
against source text so refactors and edits can't silently break a feature.

---

## 3. The tabs (product surface)

Navigation is a `activeTab` string in `App()`. Primary bottom-nav tabs plus a
secondary "Pages" switcher. Main surfaces:

- **Today** — landing/home: intake, streak, quick actions, SOS.
- **Journal** — guided check-ins persisted locally; feeds mood trend + themes.
- **Meditation / Focus (Calm)** — breathing, timers, situation-matched routines.
- **Tones** — the Pristine Tone Engine: binaural/solfège/isochronic/ambient
  tones with a safe limiter, session presets, and a persistent mini-player
  that survives tab navigation.
- **Path (Guide)** — structured issue guidance (principle/practice/boundary),
  the multidimensional Moon-chart complement, and the guided-journey bar.
- **Ask / Counselling** — `CounselingChatModal`: a two-way adaptive counselling
  chat that synthesises a personalised plan (see §4).
- **Help & Redress** — SOS, helplines, directories, complaint templates,
  first-office routing, evidence checklist.
- **Vedic** — `BirthChartSection`: birth chart, 48-dimension Moon-chart engine,
  Dasha timeline + 15-year forecast, Yogas, Ashtakavarga, Shadbala, and the
  bilingual "Ask the chart" flow.
- **Patterns (Insights)** — weekly/monthly trend, pattern critique, report card.
- **Community** — moderated feed + verified private chat (Supabase realtime).
- **Explore (Search)** — global search across guides/redress/help/community.
- **Settings / Profile / Language / Admin** — profile, identity, language,
  backup, and a gated admin panel.

---

## 4. The two engines

### Counselling engine

`CounselingChatModal` drives an adaptive chat. Key functions in `App.tsx`:

- `detectThemes(text)` — maps free text (issue + chat turns + recent journal
  notes) to support-dimension themes.
- `buildCounselingQuestions(themes, index, ...)` — adaptive follow-up questions.
- `buildCounselingSynthesis(session, issueId, moonChart48Readings, recurrenceCount, sadeSatiNote, weeklyTrend)`
  — the final personalised reflection. It layers in **only real, already-computed
  signals**: visit-recurrence (from `visitReports`), Sade Sati transit,
  measured weekly-vs-monthly clarity trend, and the Moon-chart overlay. It never
  fabricates predictions.
- `buildJourneySteps(...)` — the recommended cross-tab journey. Personalisation
  (streak, mood tag/trend, recurrence) only ever changes *reason copy* on
  already-present steps — never which steps appear or which route is recommended.

Design principle: personalisation is additive and honest. The offline synthesis
is the safety-critical baseline; optional Gemini enrichment (`onFetchGuideEnrichment`)
is layered on top and silently absent when unconfigured.

### Vedic / Moon-chart engine

Real sidereal astronomy (Lahiri ayanamsa) via `astronomy-engine`:

- `getMoonRashiFromDOB`, `getJanmaNakshatra`, `getVimshottariDashaState`,
  `getGocharChart` (transits / Sade Sati), `getLagnaFromBirthDetails`.
- `buildMoonChartMultidimensionalEngine({ ..., lang })` — the 48-dimension
  "explainable score" engine. Each of 48 life dimensions gets a score, verdict,
  interpretation, score trace, and a practical remedy, computed from
  Moon-house + Mahadasha + Antardasha + Nakshatra + Vara + Tithi (+ optional
  Lagna overlay). Fully **bilingual** (English/Hindi) via the `lang` param.
- Classical layers: `detectClassicalYogas`, `buildAshtakavarga`, `computeShadbala`
  (with Sthana/Dig/Kala/Cheshta/Naisargika + Drik + Drekkana bala).

The chart is Moon-chart-primary (Chandra Kundali); the Ascendant adds a
secondary confirming layer. No Sun-chart prediction is shown.

---

## 5. Bilingual system (two independent layers)

1. **App chrome** — the 22-language `languageId` / `getUiCopy` system governs UI
   labels and voice. It never touches prediction content.
2. **Chart content** — a separate `chartBriefLang: "en" | "hi"` toggle (lifted to
   `App()`) drives the Vedic Plain-Language card, the 48-dimension explorer, and
   the **Ask-the-chart** answer engine. Hindi packs mirror the English strings
   (`*_HI` / `MOON_CHART_48_BLUEPRINT_HI` / `RASHI_CATEGORY_LENSES_HI`, etc.).

Per-consumer routing: the counselling engine, Path complement, and Insights use
the **English canonical** readings so a Hindi toggle never leaks Hindi fragments
into the otherwise-English counselling synthesis; the chart-facing display and
Ask-the-chart use a language-aware copy.

---

## 6. Quality gates — run before every commit

Type gate:

```bash
pnpm run typecheck        # tsc --noEmit — must be clean
```

Five regression suites (literal string/regex assertions against `App.tsx`):

```bash
pnpm run test:tone            # tone engine: presets, safe limiter, reliable stop
pnpm run test:vedic           # Vedic engine: dasha math, 48 dims, bilingual, no Sun-chart text
pnpm run test:visibility      # contrast, min font sizes, design-system tokens
pnpm run test:product-quality # navigation, safeguards, crisis lifelines, redress governance
pnpm run test:upgrades        # section order, feature markers, personalization wiring
```

**Rule:** any UI string or function-signature change must update the matching
assertion in the same commit. The suites are the module boundary this
single-file app lacks.

---

## 7. Build & deploy

- **Mobile:** EAS (`npx eas build --platform android|ios`) using `eas.json`
  profiles. iOS bundle `com.aethonbeacon.app`; Android publishes to the Play
  closed-testing (Alpha) track via CI.
- **Web:** `pnpm run export:web` produces a static bundle in `dist/`. Because
  GitHub Actions minutes are capped, `scripts/manual-render-deploy.sh` builds
  locally and force-pushes to a Render-watched mirror branch. Run it from your
  own terminal (the sandbox has no push access):
  ```bash
  cd ~/AethonBeacon && git push origin master && ./scripts/manual-render-deploy.sh
  ```
- **Verification backend:** `scripts/verification-server.mjs` (OTP bridge) is
  deployed on Render (`render.yaml`). Set
  `EXPO_PUBLIC_VERIFICATION_API_BASE_URL` in the app build.

---

## 8. Known constraints / decisions on record

- **Free for the first year:** feature gating / paywall is intentionally
  deferred. `purchases.ts` + entitlement plumbing exist but no paywall UI is
  wired (by decision).
- **VedicDailyCard** (the compact daily preview) has no language toggle and
  stays English by design; only the toggle-bearing surfaces localise.
- **Moon48 embedded strings:** fully bilingual as of the latest engine pass.
- The `_tmp_*` files and the many `*.command` helper scripts at repo root are
  local build/dev conveniences, not app code.
