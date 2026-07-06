#!/bin/bash
# Upload AethonBeacon.ipa to TestFlight using app-specific password

IPA="$HOME/AethonBeacon/AethonBeacon.ipa"
LOG="$HOME/AethonBeacon/safari_dev_log.txt"

echo "" | tee -a "$LOG"
echo "=== upload_testflight.command ===" | tee -a "$LOG"
date | tee -a "$LOG"

if [ ! -f "$IPA" ]; then
  echo "ERROR: IPA not found at $IPA" | tee -a "$LOG"
  exit 1
fi
echo "IPA found: $IPA ($(du -sh "$IPA" | cut -f1))" | tee -a "$LOG"

# Show GUI password dialog for app-specific password
APPPASS=$(osascript << 'APPL'
tell application "System Events"
  try
    set d to display dialog "Enter app-specific password for slathiarimple567@gmail.com" & return & return & "Generate one at: appleid.apple.com → Sign-In & Security → App-Specific Passwords" with title "AethonBeacon → TestFlight Upload" default answer "" with hidden answer buttons {"Cancel", "Upload to TestFlight"} default button "Upload to TestFlight"
    if button returned of d is "Upload to TestFlight" then
      return text returned of d
    end if
  on error
    return ""
  end try
end tell
APPL
)

if [ -z "$APPPASS" ]; then
  echo "No password entered — upload cancelled." | tee -a "$LOG"
  exit 1
fi

echo "Password entered. Starting upload..." | tee -a "$LOG"

xcrun altool --upload-app \
  --type ios \
  --file "$IPA" \
  --username "slathiarimple567@gmail.com" \
  --password "$APPPASS" \
  --output-format xml \
  2>&1 | tee -a "$LOG"

RESULT=$?
if [ $RESULT -eq 0 ]; then
  echo "" | tee -a "$LOG"
  echo "=== UPLOAD SUCCESSFUL — check TestFlight in App Store Connect ===" | tee -a "$LOG"
else
  echo "" | tee -a "$LOG"
  echo "Upload exit code: $RESULT — check log above." | tee -a "$LOG"
fi

cat "$LOG" | tail -40
