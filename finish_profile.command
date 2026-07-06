#!/bin/bash
# Finish provisioning profile form already open in Safari, then archive + upload

LOG="$HOME/AethonBeacon/safari_dev_log.txt"
echo "" | tee -a "$LOG"
echo "=== finish_profile.command ===" | tee -a "$LOG"
date | tee -a "$LOG"

# Helper: write JS to file, run via AppleScript
run_step() {
  local label="$1"
  local jscode="$2"
  local delay_secs="$3"
  printf '%s' "$jscode" > /tmp/as_js_payload.js
  cat > /tmp/as_step.applescript << 'APPL'
tell application "Safari"
  tell front document
    try
      set jsCode to do shell script "cat /tmp/as_js_payload.js"
      set r to do JavaScript jsCode
      if r is missing value then return "MISSING_VALUE"
      return r
    on error e number n
      return "AS_ERR " & n & ": " & e
    end try
  end tell
end tell
APPL
  local result
  result=$(osascript /tmp/as_step.applescript 2>&1)
  echo "$label: $result" | tee -a "$LOG"
  sleep "$delay_secs"
  echo "$result"
}

# Check current page
PAGE=$(run_step "Page check" \
  "(function(){return document.title+' | '+window.location.href;})()" \
  1)

echo "Current page: $PAGE" | tee -a "$LOG"

# If we're on the "Review, Name and Generate" step — just complete it
# Use React-compatible input setter to unblock the Generate button
R_NAME=$(run_step "Enter name" \
  "(function(){
    var inputs=document.querySelectorAll('input[type=text],input:not([type])');
    for(var i=0;i<inputs.length;i++){
      var inp=inputs[i];
      if(inp.readOnly||inp.disabled)continue;
      var setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
      setter.call(inp,'AethonBeacon AppStore Distribution');
      inp.dispatchEvent(new Event('input',{bubbles:true}));
      inp.dispatchEvent(new Event('change',{bubbles:true}));
      return 'Name set: '+inp.value;
    }
    return 'No editable input. Title:'+document.title;
  })()" \
  2)

# Small delay then click Generate / Continue
R_GEN=$(run_step "Click Generate" \
  "(function(){
    var bs=document.querySelectorAll('button');
    for(var i=0;i<bs.length;i++){
      var t=bs[i].textContent.trim();
      if((t==='Generate'||t==='Continue')&&!bs[i].disabled){
        bs[i].click();
        return 'Clicked: '+t;
      }
    }
    var allBtns=Array.prototype.map.call(bs,function(b){return b.textContent.trim()+'(disabled='+b.disabled+')';}).join(',');
    return 'No enabled Generate/Continue. Btns: '+allBtns;
  })()" \
  15)

# Click Download
R_DL=$(run_step "Click Download" \
  "(function(){
    var elems=document.querySelectorAll('button,a');
    for(var i=0;i<elems.length;i++){
      var t=elems[i].textContent.trim().toLowerCase();
      var h=(elems[i].href||'');
      if(t==='download'||h.indexOf('.mobileprovision')>=0){
        elems[i].click();
        return 'Download clicked: '+elems[i].textContent.trim();
      }
    }
    var title=document.title;
    var btns=Array.prototype.map.call(document.querySelectorAll('button'),function(b){return b.textContent.trim();}).join(',');
    return 'No download btn. Title:'+title+' Btns:'+btns;
  })()" \
  10)

echo "" | tee -a "$LOG"
echo "R_NAME=$R_NAME" | tee -a "$LOG"
echo "R_GEN=$R_GEN" | tee -a "$LOG"
echo "R_DL=$R_DL" | tee -a "$LOG"

# Check for downloaded profile
sleep 5
PROFILE=$(ls -t ~/Downloads/*.mobileprovision 2>/dev/null | head -1)
if [ -z "$PROFILE" ]; then
  echo "" | tee -a "$LOG"
  echo "No profile in Downloads yet. Checking Safari state..." | tee -a "$LOG"
  CURURL=$(osascript -e 'tell application "Safari" to get URL of front document' 2>&1)
  CURTITLE=$(osascript -e 'tell application "Safari" to tell front document to do JavaScript "document.title"' 2>&1)
  echo "Safari: $CURTITLE | $CURURL" | tee -a "$LOG"

  # Try clicking Download again in case page just loaded
  sleep 5
  run_step "Download retry" \
    "(function(){
      var elems=document.querySelectorAll('button,a');
      for(var i=0;i<elems.length;i++){
        var t=elems[i].textContent.trim().toLowerCase();
        if(t==='download'){elems[i].click();return 'Retry download clicked';}
      }
      return 'Still no download. Btns:'+Array.prototype.map.call(document.querySelectorAll('button'),function(b){return b.textContent.trim();}).join(',');
    })()" \
    8

  PROFILE=$(ls -t ~/Downloads/*.mobileprovision 2>/dev/null | head -1)
fi

if [ -z "$PROFILE" ]; then
  echo "FATAL: No .mobileprovision found after download attempts." | tee -a "$LOG"
  cat "$LOG"
  exit 1
fi

echo "Profile downloaded: $PROFILE" | tee -a "$LOG"

# Extract UUID + install
UUID=$(security cms -D -i "$PROFILE" 2>/dev/null | plutil -extract UUID raw - 2>/dev/null)
echo "UUID: $UUID" | tee -a "$LOG"
if [ -z "$UUID" ]; then
  echo "ERROR: Could not extract UUID from profile." | tee -a "$LOG"
  cat "$LOG"
  exit 1
fi

PP_DIR=~/Library/MobileDevice/Provisioning\ Profiles
mkdir -p "$PP_DIR"
cp "$PROFILE" "$PP_DIR/${UUID}.mobileprovision"
echo "Profile installed to $PP_DIR/${UUID}.mobileprovision" | tee -a "$LOG"

# Write exportOptions.plist (profile name may be wildcard — use UUID directly)
PROFILE_NAME=$(security cms -D -i "$PROFILE" 2>/dev/null | plutil -extract Name raw - 2>/dev/null)
echo "Profile Name: $PROFILE_NAME" | tee -a "$LOG"

cat > ~/AethonBeacon/ios/exportOptions.plist << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>teamID</key>
  <string>846YFF8Z98</string>
  <key>uploadBitcode</key>
  <false/>
  <key>uploadSymbols</key>
  <true/>
  <key>signingStyle</key>
  <string>manual</string>
  <key>provisioningProfiles</key>
  <dict>
    <key>com.aethon.beacon</key>
    <string>${PROFILE_NAME}</string>
  </dict>
</dict>
</plist>
PLIST
echo "exportOptions.plist written with profile: $PROFILE_NAME" | tee -a "$LOG"

# xcodebuild archive
echo "" | tee -a "$LOG"
echo "=== xcodebuild archive ===" | tee -a "$LOG"
cd ~/AethonBeacon
rm -rf /tmp/AethonBeacon.xcarchive

xcodebuild \
  -workspace ios/AethonBeacon.xcworkspace \
  -scheme AethonBeacon \
  -sdk iphoneos \
  -configuration Release \
  -archivePath /tmp/AethonBeacon.xcarchive \
  archive \
  DEVELOPMENT_TEAM=846YFF8Z98 \
  CODE_SIGN_STYLE=Manual \
  "CODE_SIGN_IDENTITY=Apple Distribution" \
  "PROVISIONING_PROFILE_SPECIFIER=${PROFILE_NAME}" \
  2>&1 | tail -60 | tee -a "$LOG"

if [ ! -d /tmp/AethonBeacon.xcarchive ]; then
  echo "ERROR: Archive failed. Check log above." | tee -a "$LOG"
  cat "$LOG"
  exit 1
fi
echo "Archive SUCCESS" | tee -a "$LOG"

# Export IPA
echo "" | tee -a "$LOG"
echo "=== Export IPA ===" | tee -a "$LOG"
rm -rf /tmp/AethonBeaconIPA
xcodebuild -exportArchive \
  -archivePath /tmp/AethonBeacon.xcarchive \
  -exportPath /tmp/AethonBeaconIPA \
  -exportOptionsPlist ~/AethonBeacon/ios/exportOptions.plist \
  2>&1 | tail -30 | tee -a "$LOG"

IPA=$(find /tmp/AethonBeaconIPA -name "*.ipa" 2>/dev/null | head -1)
if [ -z "$IPA" ]; then
  echo "ERROR: IPA export failed." | tee -a "$LOG"
  cat "$LOG"
  exit 1
fi

cp "$IPA" ~/AethonBeacon/AethonBeacon.ipa
echo "IPA: ~/AethonBeacon/AethonBeacon.ipa" | tee -a "$LOG"

# Upload to TestFlight via altool
echo "" | tee -a "$LOG"
echo "=== Upload to TestFlight ===" | tee -a "$LOG"
xcrun altool --upload-app \
  --type ios \
  --file "$IPA" \
  --username slathiarimple567@gmail.com \
  --password "@keychain:Application Loader: slathiarimple567@gmail.com" \
  2>&1 | tee -a "$LOG"

ALTOOL_EXIT=$?
if [ $ALTOOL_EXIT -ne 0 ]; then
  echo "" | tee -a "$LOG"
  echo "altool failed (exit $ALTOOL_EXIT). Trying xcrun notarytool / Transporter approach..." | tee -a "$LOG"
  # Try app-specific password from keychain with different label
  xcrun altool --upload-app \
    --type ios \
    --file "$IPA" \
    --username slathiarimple567@gmail.com \
    --password "@keychain:Transporter: slathiarimple567@gmail.com" \
    2>&1 | tee -a "$LOG" || \
  echo "Manual upload needed: open Xcode Organizer or Transporter with $IPA" | tee -a "$LOG"
fi

echo "" | tee -a "$LOG"
echo "=== PIPELINE COMPLETE ===" | tee -a "$LOG"
cat "$LOG"
