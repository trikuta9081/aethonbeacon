#!/bin/bash
# EAS Submit — upload existing IPA to TestFlight
# App Store Connect App ID: 6780326263 (from eas.json)

LOG="$HOME/AethonBeacon/safari_dev_log.txt"
echo "" | tee -a "$LOG"
echo "=== eas_submit_ios.command ===" | tee -a "$LOG"
date | tee -a "$LOG"

IPA="$HOME/AethonBeacon/AethonBeacon.ipa"

if [ ! -f "$IPA" ]; then
  echo "ERROR: IPA not found at $IPA" | tee -a "$LOG"
  exit 1
fi
echo "IPA: $IPA ($(du -sh "$IPA" | cut -f1))" | tee -a "$LOG"

cd "$HOME/AethonBeacon"

# Check EAS login
echo "" | tee -a "$LOG"
echo "EAS whoami:" | tee -a "$LOG"
eas whoami 2>&1 | tee -a "$LOG"

echo "" | tee -a "$LOG"
echo "=== Submitting to TestFlight ===" | tee -a "$LOG"

eas submit \
  --platform ios \
  --path "$IPA" \
  --profile production \
  2>&1 | tee -a "$LOG"

echo "" | tee -a "$LOG"
echo "=== Submit complete — check above for result ===" | tee -a "$LOG"
echo "If successful, check TestFlight in App Store Connect:" | tee -a "$LOG"
echo "https://appstoreconnect.apple.com/apps/6780326263/testflight/ios" | tee -a "$LOG"

cat "$LOG" | tail -30
