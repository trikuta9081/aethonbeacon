# Auto-publish setup — TestFlight + Play Console

Once the secrets below are set, every push to `master` publishes automatically.

Add secrets at: **`github.com/trikuta9081/aethonbeacon/settings/secrets/actions`**

Account: `slathiarimple567@gmail.com` (Apple Team `846YFF8Z98`, same email for Play).

---

## iOS → TestFlight (3 secrets, no passwords, no 2FA at runtime)

Xcode auto-manages certs + provisioning profiles at build time via the ASC API key.

### 1. `APPSTORE_API_KEY_ID`
Value: `4Y6H9428FJ`

### 2. `APPSTORE_API_ISSUER_ID`
Value: `987583dc-d087-45b3-ad8a-550f59621e8d`

### 3. `APPSTORE_API_KEY_P8`
Value: full contents of the `AuthKey_4Y6H9428FJ.p8` file you downloaded from App Store Connect.

Open the .p8 file in TextEdit → Cmd+A → Cmd+C → paste the entire text (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines and the base64 block between them) as the secret value.

**⚠️ You can only download the .p8 once from Apple.** If lost, generate a new key at `appstoreconnect.apple.com/access/integrations/api` and update `APPSTORE_API_KEY_ID` + the new .p8 content.

Once these 3 are set → next push builds + uploads to TestFlight automatically.

---

## Android → Play Console (1 secret)

### 4. `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
Value: full JSON contents of a Google Cloud service account key.
Paste the complete JSON object as plain text. If you copied it from a file, keep the braces and all fields intact; the workflow now validates the JSON before publish.

Steps to generate:
1. Play Console → Setup → API access → Create service account (follows link to Google Cloud Console).
2. Name it `aethon-beacon-ci`, click Create.
3. Grant this role: **Service Account User**.
4. Back in Play Console → API access → find your new service account → Grant access → give it `Release manager` role for the Aethon Beacon app.
5. Google Cloud Console → IAM & Admin → Service Accounts → your new one → Keys tab → Add Key → Create new key → JSON → downloads a `.json` file.
6. Open the .json in TextEdit → Cmd+A → Cmd+C → paste the entire contents (including the outer `{` and `}`) as the secret value.

Once this 1 secret is set → next push builds AAB + uploads to Play Console internal track as a draft.

---

## Manual upload for the current release (if you don't want to wait for automation)

The current push is building at `github.com/trikuta9081/aethonbeacon/actions`. In ~20–25 min:

- **iOS `.ipa`:** latest run → `AethonBeacon-ios-ipa` artifact → download → open Transporter.app → drag it in → Deliver.
- **Android `.aab`:** same run → `aethon-beacon-release-aab` artifact → download → Play Console → Internal testing → Create release → upload.

---

## Security note

- The three iOS secrets and one Android secret above are API keys, not passwords. They can be scoped and revoked from their respective consoles at any time.
- Never paste any of these values into chat with anyone — including automation assistants. Paste them straight from your file/clipboard into the GitHub Secrets input.
- If a `.p8` or service-account `.json` is ever exposed, revoke it at the console and generate a new one. GitHub Secrets are encrypted at rest and never displayed after entry.
