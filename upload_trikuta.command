#!/bin/bash
# Upload AethonBeacon.ipa to TestFlight using trikuta9081@gmail.com
# This account is likely the one that owns App Store Connect app ID 6780326263

IPA="$HOME/AethonBeacon/AethonBeacon.ipa"
LOG="$HOME/AethonBeacon/safari_dev_log.txt"
APPLE_ID="trikuta9081@gmail.com"

echo "" | tee -a "$LOG"
echo "=== upload_trikuta.command ===" | tee -a "$LOG"
date | tee -a "$LOG"

if [ ! -f "$IPA" ]; then
  echo "ERROR: IPA not found at $IPA" | tee -a "$LOG"
  exit 1
fi
echo "IPA: $IPA ($(du -sh "$IPA" | cut -f1))" | tee -a "$LOG"

# Prompt for password directly in Terminal (no GUI dialog needed)
echo ""
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│  ENTER APP-SPECIFIC PASSWORD for trikuta9081@gmail.com          │"
echo "│                                                                  │"
echo "│  1. appleid.apple.com → Sign-In & Security → App-Specific Passwords │"
echo "│  2. Click +  →  Label: 'testflight'  →  Create                  │"
echo "│  3. Copy the xxxx-xxxx-xxxx-xxxx password shown                 │"
echo "│  4. Paste it here and press Enter                               │"
echo "└─────────────────────────────────────────────────────────────────┘"
echo ""
read -s -p "App-specific password: " APPPASS
echo ""

if [ -z "$APPPASS" ]; then
  echo "No password entered — cancelled." | tee -a "$LOG"
  exit 1
fi

echo "Password entered. Starting upload via xcrun altool..." | tee -a "$LOG"
echo "Apple ID: $APPLE_ID" | tee -a "$LOG"

xcrun altool --upload-app \
  --type ios \
  --file "$IPA" \
  --username "$APPLE_ID" \
  --password "$APPPASS" \
  2>&1 | tee -a "$LOG"

RESULT=$?
echo "" | tee -a "$LOG"
if [ $RESULT -eq 0 ]; then
  echo "=== UPLOAD SUCCESSFUL ===" | tee -a "$LOG"
  echo "Check TestFlight: https://appstoreconnect.apple.com/apps/6780326263/testflight/ios" | tee -a "$LOG"
else
  echo "Upload failed (exit $RESULT) — check log above" | tee -a "$LOG"
  echo "" | tee -a "$LOG"
  echo "If error says 'No suitable application records found', the app is NOT under trikuta9081@gmail.com." | tee -a "$LOG"
  echo "In that case, try upload_testflight.command (slathiarimple567@gmail.com) with an app-specific password." | tee -a "$LOG"
fi

cat "$LOG" | tail -40
