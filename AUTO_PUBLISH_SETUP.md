# Auto-publish setup — TestFlight + Play Console

Your GitHub CI workflows are wired to publish automatically on every push to `master` — but only if the following secrets are set. Without them, the workflows still build the app and upload `.apk` / `.aab` / `.ipa` as GitHub Actions artifacts you can download and upload manually.

Account: `slathiarimple567@gmail.com` (Apple Team ID `846YFF8Z98`, same email for Play Console).

Add secrets at: **`github.com/trikuta9081/aethonbeacon/settings/secrets/actions`**

## iOS → TestFlight (auto-upload)

You need **8 secrets** total for full end-to-end auto-upload. If you skip any of them, the workflow still archives the `.ipa` (downloadable artifact) but does not upload.

### Apple signing (5 secrets)

1. **`APPLE_TEAM_ID`** = `846YFF8Z98`

2. **`APPLE_CERTIFICATE_BASE64`** — your Apple Distribution `.p12` file, base64-encoded.
   Export from Keychain Access → your distribution cert → right-click Export → `.p12` with a password.
   Then in Terminal:
   ```
   base64 -i ~/Downloads/AethonDist.p12 | pbcopy
   ```
   Paste the copied text as the secret value.

3. **`APPLE_CERTIFICATE_PASSWORD`** = the password you chose when exporting the `.p12`.

4. **`APPLE_PROVISIONING_PROFILE`** — your `Aethon Beacon App Store` provisioning profile, base64-encoded.
   Download from `developer.apple.com/account/resources/profiles/list`.
   ```
   base64 -i ~/Downloads/Aethon_Beacon_App_Store.mobileprovision | pbcopy
   ```

5. **`KEYCHAIN_PASSWORD`** = any random string you make up (used inside the CI runner).

### App Store Connect API for upload (3 secrets)

6. **`APPSTORE_API_KEY_ID`** — the 10-char key ID.

7. **`APPSTORE_API_ISSUER_ID`** — the UUID from ASC → Users and Access → Integrations → Team Keys.

8. **`APPSTORE_API_KEY_P8`** — the contents of the `.p8` API key file (you can only download it once when created).

Get them here: `appstoreconnect.apple.com/access/api` → generate an "App Manager" role key.

Once these 8 are set, the next push to `master` builds and uploads to TestFlight automatically. No Apple ID / 2FA needed at runtime.

## Android → Play Console (auto-upload)

You need **1 secret**.

1. **`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`** — full JSON contents of a Google Cloud service account key.
   How to create:
   - Play Console → Setup → API access → Create service account
   - Give it the `Release manager` role for your app
   - Google Cloud Console → IAM & Admin → Service Accounts → your new one → Keys → Add Key → JSON
   - Paste the entire JSON (including braces) as the secret value.

Once set, each push builds the AAB and uploads to the `internal` track as a draft. You review + promote to production from Play Console.

## Manual upload for this current release

The current push (`050952c`) is already building. In ~20–30 min:

- **iOS `.ipa`:** `github.com/trikuta9081/aethonbeacon/actions` → latest run → `AethonBeacon-ios-ipa` artifact → open Transporter.app, drag it in, deliver.
- **Android `.aab`:** same actions run → `aethon-beacon-release-aab` artifact → Play Console → Internal testing → create release → upload.
