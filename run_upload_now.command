#!/bin/bash
set -e
cd "$HOME/AethonBeacon"
LOG="$HOME/AethonBeacon/upload_log.txt"

echo "=== Deploy: Web + Android ===" | tee "$LOG"
date | tee -a "$LOG"

# ── Step 1: Clean lock + commit app.json ─────────────────
echo "" | tee -a "$LOG"
echo "── Step 1: Commit app.json ──" | tee -a "$LOG"
rm -f .git/index.lock .git/HEAD.lock
git add app.json
git diff --cached --stat | tee -a "$LOG"
git commit -m "fix: update iOS bundleIdentifier to com.aethonbeacon.app" 2>&1 | tee -a "$LOG" || echo "(nothing to commit)" | tee -a "$LOG"

# ── Step 2: Clean + build web bundle ─────────────────────
echo "" | tee -a "$LOG"
echo "── Step 2: Building fresh web bundle ──" | tee -a "$LOG"
rm -rf dist/ .expo
rm -rf node_modules/.cache /tmp/metro-* /tmp/haste-* 2>/dev/null || true
export EXPO_PUBLIC_VERIFICATION_API_BASE_URL=https://aethon-beacon-verification.onrender.com
npm run export:web 2>&1 | tee -a "$LOG"

# ── Step 3: Commit + push to GitHub + Render ─────────────
echo "" | tee -a "$LOG"
echo "── Step 3: Pushing web to GitHub + Render ──" | tee -a "$LOG"
git add -A
git add -f dist/
git commit -m "deploy: updated web bundle + iOS bundleId fix" 2>&1 | tee -a "$LOG" || echo "(nothing to commit)" | tee -a "$LOG"
git push origin master 2>&1 | tee -a "$LOG"
git push render master 2>&1 | tee -a "$LOG"
echo "Web live at aethonbeacon.com" | tee -a "$LOG"

# ── Step 4: Android local release build ──────────────────
echo "" | tee -a "$LOG"
echo "── Step 4: Building Android release APK ──" | tee -a "$LOG"
npx expo prebuild --platform android --no-install 2>&1 | tee -a "$LOG"
cd android
./gradlew assembleRelease 2>&1 | tee -a "$LOG"
cd ..

APK="$HOME/AethonBeacon/android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK" ]; then
  SIZE=$(du -sh "$APK" | cut -f1)
  echo "" | tee -a "$LOG"
  echo "=== ANDROID APK READY ===" | tee -a "$LOG"
  echo "APK: $APK ($SIZE)" | tee -a "$LOG"
  # Copy to AethonBeacon root for easy access
  cp "$APK" "$HOME/AethonBeacon/AethonBeacon-release.apk"
  echo "Copied to: $HOME/AethonBeacon/AethonBeacon-release.apk" | tee -a "$LOG"
else
  echo "ERROR: APK not found at $APK" | tee -a "$LOG"
fi

echo "" | tee -a "$LOG"
echo "=== ALL DONE ===" | tee -a "$LOG"
echo "  Web: live at https://aethonbeacon.com" | tee -a "$LOG"
echo "  Android APK: $HOME/AethonBeacon/AethonBeacon-release.apk" | tee -a "$LOG"

rm -- "$0"
echo ""
echo "Done. Press any key to close."
read -n1
