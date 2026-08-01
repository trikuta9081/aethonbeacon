# Aethon Beacon

Aethon Beacon is a cross-platform guidance and redressal app scaffolded with Expo and React Native. The same source can run on Android, iOS, and web.

Deploy the Aethon Beacon verification backend on Render:

https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Ftrikuta9081%2FAETHON-beacon-.git

If Render asks for manual Blueprint details, use branch `main` and Blueprint file path `render.yaml`.

## What is included

- Expo app source in `App.tsx`
- Android/iOS/web config in `app.json`
- EAS build profiles in `eas.json`
- Local-first check-ins and journal persistence with AsyncStorage
- Tabbed product shell for Today, Journal, Focus, Play, Search, Community, Guide, Redress, Insights, and Settings
- Identity profiles for student, teacher, professional, parent, child, officer, official, caregiver, retired, and general use
- Daily reminder notifications with time-of-day presets on iOS and Android
- SOS call button with a configurable local emergency number
- Trusted support contacts with quick call/text actions
- Main-screen support band that surfaces trusted people when the user needs them
- Official Indian government helplines and portals for emergencies, women, children, students, support, and cybercrime
- Verified professional help links for psychologists, counselors, doctors, clinics, hospitals, and telemedicine
- Nearby locality helper for personalized professional-help searches
- Role-aware recommended care paths based on the selected identity
- Issue guide for anger, anxiety, fear, overconfidence, shame, burnout, and loneliness
- Saved follow-up steps inside the Guide tab so progress can be revisited later
- Shareable safety plan export from the Guide tab
- Issue follow-up reminders for tomorrow or next week
- Complaint redressal guide for academic, harassment, ragging, public office, private institution, and crime-related complaints
- Institution map for universities, IITs, NLUs, medical colleges, schools, banks, factories, private firms, and semi-govt bodies
- Play tab with calm challenge cards, points, and progress tracking for a game-like support loop
- Community tab with a direct verified chat box, moderated public feed, topic filters, saved items, report/hide controls, verified voices, and adult-content/offensive-content blocking; chat and messaging are locked until one verified contact method is completed
- Access center with guest/member/verified/admin roles, OTP-backed phone/email verification, and a private admin panel for launch controls
- Security threat controls for pausing community posting, hiding sensitive previews, reviewing recent reports, and tracking safety checks
- Search tab with global search across guides, redress, official help, professional help, and community notes, plus quick access shortcuts
- Main-screen vision band that explains what the app does and how it helps
- Vision panel that explains how the app helps across practical, emotional, psychological, spiritual, and cultural layers
- First-run onboarding that sets identity, reminder cadence, and emergency support
- Weekly and monthly trend insights with a supportive identity lens
- Local backup export and an onboarding replay control in Settings
- Launch and access controls in Settings for sign-in, sign-out, and admin management
- Launch assets for app icon, adaptive icon, splash, and favicon in `assets/`
- Static zero-install web preview in `outputs/index.html`
- Generated project hero image in `assets/aethon-beacon-hero.png` and `outputs/aethon-beacon-hero.png`
- Product roadmap in `docs/product-roadmap.md`
- Launch checklist in `docs/launch-checklist.md`
- Release candidate checklist in `docs/release-candidate.md`
- Store copy in `docs/store-copy.md`
- Privacy policy draft in `docs/privacy-policy.md`
- Terms of use draft in `docs/terms-of-use.md`
- Disclaimer draft in `docs/disclaimer.md`
- Trademark pack in `docs/trademark-pack.md`
- Verification delivery plan in `docs/verification-delivery-plan.md`
- Verification backend deployment in `docs/verification-backend-deployment.md`
- Production OTP launch guide in `docs/production-otp-launch.md`
- GitHub and Render upload checklist in `docs/github-render-upload-checklist.md`
- Mobile GitHub upload guide in `docs/mobile-github-upload.md`
- Launch runbook in `docs/launch-runbook.md`
- Cross-platform QA matrix in `docs/cross-platform-qa.md`

## Launch path

- Current status: feature-frozen release candidate for beta / soft launch
- Ready now: iOS, Android, and web build flow; SOS; trusted contacts; verified-only community; redress; guides; profile and settings; admin separation
- Verified tester state: the Google Play closed-testing tester list is in place and stable
- Final public-launch blocker: replace the local OTP flow with at least one live SMS or email delivery lane, then set the AI key for Gemini-backed help if you want Gemini instead of local fallback
- Public OTP delivery config: set `EXPO_PUBLIC_VERIFICATION_API_BASE_URL` to the backend base URL before public launch
- At least one OTP provider path must be live for launch: Twilio or a phone webhook bridge, or SendGrid or an email webhook bridge
- AI Help production secret is optional: `GEMINI_API_KEY` enables Gemini-backed help, otherwise the app uses the local fallback
- Public launch safety settings: set `LOCAL_VERIFICATION_DEBUG=0`, `VERIFICATION_HOST=0.0.0.0`, and `VERIFICATION_CORS_ORIGIN=https://aethonbeacon.com` on the verification backend
- Root launch env template: copy `.env.production.example` before building release binaries, then run `pnpm run verification:env-check`
- Current env-check result in this workspace: no OTP lane is configured here, and Gemini is falling back locally until a provider secret is set
- Next step: finish store submission assets, release signing, and public release packaging once verification delivery and AI provider settings are connected
- Local verification bridge: run `pnpm run verification:server` for end-to-end testing during beta
- One-command beta stack: run `pnpm run dev:launch` to start the verification bridge and Expo web together
- Optional webhook delivery: set `VERIFICATION_SMS_WEBHOOK_URL` and `VERIFICATION_EMAIL_WEBHOOK_URL` for a provider-backed bridge
- Containerized verification backend: use `Dockerfile.verification` for a minimal deployable OTP service
- Containerized web host: use `Dockerfile.web` to serve the exported static web app
- Launch runbook: follow `docs/launch-runbook.md` for the beta-to-public release path
- Backend deployment guide: follow `docs/verification-backend-deployment.md` for the production OTP service
- Gemini setup: follow `docs/gemini-setup.md` to create and deploy `GEMINI_API_KEY`
- QA matrix: follow `docs/cross-platform-qa.md` for the iPhone, Android, and web pass before launch

## Local setup

Use the bundled Node and pnpm tools that ship with this workspace:

```bash
PATH=/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH \
/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm install
```

Expo SDK 56 expects Node 22.13 or newer. To refresh dependencies and run the web build:

```bash
PATH=/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH \
/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm run web
```

For mobile development:

```bash
PATH=/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH \
/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm run android
PATH=/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH \
/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm run ios
```

For Android development builds and reminder QA:

```bash
export JAVA_HOME=/Users/rajeshwerslathiia/Documents/Codex/jdk/jdk-17.0.19+10/Contents/Home
export ANDROID_HOME=/Users/rajeshwerslathiia/Library/Android/sdk
PATH=/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH \
/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm run run:android
PATH=/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH \
/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm run android:dev
PATH=/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH \
/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm run start -- --dev-client --localhost --port 8081
```

Use the development client for Android reminder testing. Expo Go on Android SDK 53+ no longer supports the remote push-notification path used by `expo-notifications`.

## iOS simulator status

This Mac has Xcode 26.5 selected at `/Applications/Xcode.app/Contents/Developer`. The iOS 26.5 Simulator runtime is installed, and an iPhone 17 simulator was booted successfully.

The most reliable local simulator flow so far is:

```bash
xcrun simctl boot 5EAEF2DA-015F-4119-B2FF-619DA941BA93
xcrun simctl launch booted host.exp.Exponent
PATH=/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH \
/Users/rajeshwerslathiia/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm exec expo start --host lan --port 8081
xcrun simctl openurl booted exp://192.168.29.146:8081
```

Expo Go may show a first-run developer-menu overlay. Tap `Continue` once in the simulator to dismiss it.

The launch asset set uses the generated `assets/icon.png` gold-A mark consistently for the Expo fallback, iOS, web favicon, and in-app branding. Android adaptive resources are generated from `assets/adaptive-icon.png` on the dark brand background; run `python3 scripts/generate-brand-icons.py` after changing the source artwork.

Daily reminder notifications are available on iOS and Android. In the web preview, the reminder control is visible but disabled because browser notification scheduling is not supported the same way.
The SOS button opens the configured emergency number from the main screen. Set the number in Settings so it matches your region.
Use the Settings tab to choose the identity profile that fits the user and to see the app’s care model in practical, emotional, psychological, spiritual, and cultural terms.
The same Settings area also lets you export a local backup and show onboarding again if you want to review the setup flow.
It also includes a locality field for nearby professional-help searches and keeps official verified registries visible for psychologists, counselors, doctors, and facilities.
The Professional help area also suggests a first-step care path based on the selected role, so the app can guide users toward the right kind of support without making them guess.
The Access center lets the app stay friendly for regular users while keeping moderation and launch controls separate for admins.
The Guide tab adds issue-specific support for anger, anxiety, fear, overconfidence, shame, burnout, and loneliness, with logical, theoretical, emotional, spiritual, and cultural framing.
It also saves follow-up steps for each issue, so the app can remember what the user already tried and what comes next.
The Guide tab can also export a shareable safety plan with the current issue, action steps, support paths, and urgent-support note.
It can also schedule a follow-up reminder for tomorrow or next week so the user comes back to the issue with more distance and less pressure.
The Redress tab helps the user file and pursue complaints against teachers, professors, department heads, institutions, government offices, private institutions, or criminal threats using the right first office, escalation path, and official portal.

## Android emulator status

The local Android CLI is installed at `~/.local/bin/android`, with the SDK located at `~/Library/Android/sdk`.

The emulator stack that is currently working is:

```bash
/Users/rajeshwerslathiia/.local/bin/android emulator list
/Users/rajeshwerslathiia/.local/bin/android emulator start --cold medium_phone
```

Expo Go can then be opened on the emulator by pressing `a` in the running Expo server session. The current Android proof image is in `outputs/android-aethon-running.png`.

For cloud builds:

```bash
npx eas build --platform android
npx eas build --platform ios
```

## Recommended next decisions

- Bundle IDs are aligned to `com.aethon.beacon` for both iOS and Android; replace it only if the legal entity or store strategy changes.
- Replace the local access center with real backend authentication before a public release.
- Decide whether journal entries stay local-first, sync to a backend, or use encrypted cloud storage.
- Add a separate watch companion phase for Apple Watch and Wear OS; the current Expo app does not yet include watch-specific targets or watch UI.
