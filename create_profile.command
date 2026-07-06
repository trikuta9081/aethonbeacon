#!/bin/bash
# Full pipeline: enable Safari developer JS, create provisioning profile, archive + export IPA

LOG="$HOME/AethonBeacon/safari_dev_log.txt"
echo "=== Safari Dev + Profile Creation ===" > "$LOG"
date >> "$LOG"

# ============================================================
# PHASE 1: Activate Safari
# ============================================================
echo "Phase 1: Activating Safari..." | tee -a "$LOG"
osascript << 'DONE'
tell application "Safari"
  activate
end tell
DONE
sleep 2

# Check current menu bar for Develop menu
MENUS=$(osascript << 'DONE'
tell application "System Events"
  tell process "Safari"
    try
      return name of every menu bar item of menu bar 1 as string
    on error e
      return "Error: " & e
    end try
  end tell
end tell
DONE
)
echo "Current menus: $MENUS" | tee -a "$LOG"

# ============================================================
# PHASE 2: Enable Develop menu if not present
# ============================================================
if ! echo "$MENUS" | grep -q "Develop"; then
  echo "Phase 2: Enabling Develop menu via Safari Settings..." | tee -a "$LOG"

  # Open Settings with Cmd+,
  osascript << 'DONE'
  tell application "System Events"
    tell process "Safari"
      keystroke "," using command down
    end tell
  end tell
DONE
  sleep 3

  # Try to click Advanced tab
  ADV=$(osascript << 'DONE'
  tell application "System Events"
    tell process "Safari"
      try
        -- Try clicking Advanced button in toolbar
        try
          click button "Advanced" of toolbar 1 of window 1
          return "Clicked Advanced in toolbar"
        end try

        -- Try tab group
        try
          set tg to tab group 1 of window 1
          click radio button "Advanced" of tg
          return "Clicked Advanced in tab group"
        end try

        -- List all buttons
        set btns to {}
        try
          set allBtns to buttons of toolbar 1 of window 1
          repeat with b in allBtns
            try
              set end of btns to name of b
            end try
          end repeat
        end try
        return "Toolbar buttons: " & (btns as string)
      on error e
        return "Error: " & e
      end try
    end tell
  end tell
DONE
  )
  echo "Advanced tab: $ADV" | tee -a "$LOG"
  sleep 2

  # Enable developer checkbox - specific search with full logging
  CBRESULT=$(osascript << 'DONE'
  tell application "System Events"
    tell process "Safari"
      try
        set allElems to entire contents of window 1

        -- First collect ALL checkbox titles for debugging
        set cbList to {}
        repeat with elem in allElems
          try
            if class of elem is checkbox then
              set end of cbList to (title of elem)
            end if
          end try
        end repeat

        -- Now find the specific developer checkbox
        -- Must contain "features" OR contain both "web" and "developer"
        repeat with elem in allElems
          try
            if class of elem is checkbox then
              set cbTitle to title of elem
              if (cbTitle contains "features" or (cbTitle contains "web" and cbTitle contains "developer") or cbTitle contains "Developer") then
                if value of elem is 0 then
                  click elem
                  return "Enabled: " & cbTitle & " | All: " & (cbList as string)
                else
                  return "Already on: " & cbTitle & " | All: " & (cbList as string)
                end if
              end if
            end if
          end try
        end repeat

        return "Target not found. All checkboxes: " & (cbList as string)
      on error e
        return "Error: " & e
      end try
    end tell
  end tell
DONE
  )
  echo "Checkbox result: $CBRESULT" | tee -a "$LOG"
  sleep 2

  # Close Settings window
  osascript << 'DONE'
  tell application "System Events"
    tell process "Safari"
      keystroke "w" using command down
    end tell
  end tell
DONE
  sleep 2

  # Check Develop menu again
  MENUS2=$(osascript << 'DONE'
  tell application "System Events"
    tell process "Safari"
      return name of every menu bar item of menu bar 1 as string
    end tell
  end tell
DONE
  )
  echo "Menus after settings: $MENUS2" | tee -a "$LOG"
fi

# ============================================================
# PHASE 3: Enable "Allow JavaScript from Apple Events"
# In Safari 17+ this moved to Develop > Developer Settings...
# ============================================================
echo "Phase 3: Enabling Allow JS from Apple Events..." | tee -a "$LOG"
JSALLOW=$(osascript << 'DONE'
tell application "System Events"
  tell process "Safari"
    try
      -- First try directly in Develop menu (older Safari)
      try
        click menu item "Allow JavaScript from Apple Events" of menu "Develop" of menu bar 1
        return "Clicked directly in Develop menu"
      end try

      -- Not there — try Develop > Developer Settings... (Safari 17+)
      try
        click menu item "Developer Settings…" of menu "Develop" of menu bar 1
      on error
        click menu item "Developer Settings..." of menu "Develop" of menu bar 1
      end try
      delay 2

      -- Now search the Developer Settings window for the checkbox
      set allElems to entire contents of front window
      set cbList to {}
      repeat with elem in allElems
        try
          if class of elem is checkbox then
            set end of cbList to (title of elem)
          end if
        end try
      end repeat

      -- Enable "Allow JavaScript from Apple Events"
      repeat with elem in allElems
        try
          if class of elem is checkbox then
            set cbTitle to title of elem
            if cbTitle contains "Apple Events" or cbTitle contains "JavaScript from Apple" then
              if value of elem is 0 then
                click elem
                return "Enabled in Dev Settings: " & cbTitle & " | All: " & (cbList as string)
              else
                return "Already on in Dev Settings: " & cbTitle & " | All: " & (cbList as string)
              end if
            end if
          end if
        end try
      end repeat

      return "Not found in Dev Settings. All checkboxes: " & (cbList as string)
    on error e
      return "Error: " & e
    end try
  end tell
end tell
DONE
)
echo "JS Allow result: $JSALLOW" | tee -a "$LOG"
sleep 1

# Close Developer Settings window and wait for setting to take effect
osascript << 'DONE'
tell application "System Events"
  tell process "Safari"
    try
      keystroke "w" using command down
    end try
  end tell
end tell
DONE
sleep 5

# ============================================================
# PHASE 4: Test do JavaScript
# ============================================================
echo "Phase 4: Testing do JavaScript..." | tee -a "$LOG"
JSTEST=$(osascript -e 'tell application "Safari" to tell front document to do JavaScript "document.title"' 2>&1)
echo "JS Test: $JSTEST" | tee -a "$LOG"

if echo "$JSTEST" | grep -iq "must enable\|error.*8\b"; then
  echo "ERROR: do JavaScript still blocked!" | tee -a "$LOG"
  cat "$LOG"
  exit 1
fi
echo "SUCCESS: do JavaScript works!" | tee -a "$LOG"

# Navigate to profile creation page
osascript << 'DONE'
tell application "Safari"
  activate
  open location "https://developer.apple.com/account/resources/profiles/add"
end tell
DONE
sleep 10

# ============================================================
# PHASE 5: Automate profile creation form (IIFE + file-based)
# ============================================================
echo "Phase 5: Creating provisioning profile..." | tee -a "$LOG"

# Check page state
PTITLE=$(osascript -e 'tell application "Safari" to tell front document to do JavaScript "String(document.title)"' 2>&1)
PURL=$(osascript -e 'tell application "Safari" to tell front document to do JavaScript "String(window.location.href)"' 2>&1)
echo "P5 page: $PTITLE | $PURL" | tee -a "$LOG"

# Helper: JS written to a separate file (no heredoc expansion), AppleScript reads it
run_step() {
  local label="$1"
  local jscode="$2"
  local delay_secs="$3"
  # Write JS to file safely — printf %s avoids any printf/heredoc interpretation
  printf '%s' "$jscode" > /tmp/as_js_payload.js
  # AppleScript reads JS from file at runtime — single-quoted heredoc, no bash expansion
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

# Step 1: Select App Store radio (IIFE — no top-level return)
S1=$(run_step "S1 App Store" \
  "(function(){var rs=document.querySelectorAll('input[type=radio]');for(var i=0;i<rs.length;i++){if(rs[i].value==='store'){rs[i].click();return 'Selected App Store';}}return 'Radios:'+rs.length+' vals:'+Array.prototype.map.call(rs,function(x){return x.value;}).join(',');})()" \
  2)

# Step 2: Click Continue
S2=$(run_step "S2 Continue" \
  "(function(){var bs=document.querySelectorAll('button');for(var i=0;i<bs.length;i++){if(bs[i].textContent.trim()==='Continue'&&!bs[i].disabled){bs[i].click();return 'Clicked Continue';}}return 'Btns:'+Array.prototype.map.call(bs,function(b){return b.textContent.trim();}).join(',');})()" \
  7)

# Step 3: Open dropdown + schedule option selection via setTimeout (single JS call = dropdown stays open)
S3=$(run_step "S3 SelectApp" \
  "(function(){document._s3result='pending';var container=document.querySelector('[class*=\"-container\"]');if(!container){document._s3result='NO_CONTAINER';return 'NO_CONTAINER';}var input=container.querySelector('input');var control=container.querySelector('[class*=\"-control\"]');if(input){input.focus();input.click();}if(control){control.click();}setTimeout(function(){var terms=['aethon','beacon','com.aethon'];var allDiv=document.querySelectorAll('div,li,span,option');for(var t=0;t<terms.length;t++){for(var i=0;i<allDiv.length;i++){if(allDiv[i].textContent.toLowerCase().indexOf(terms[t])>=0&&allDiv[i].children.length<2){allDiv[i].click();document._s3result='Clicked('+terms[t]+'): '+allDiv[i].textContent.trim().substring(0,60);return;}}}document._s3result='No option found';},3000);return 'Dropdown triggered, selection pending in 3s';})()" \
  6)

# Step 3b: Read the result that the setTimeout wrote to document._s3result
S3b=$(run_step "S3b Result" \
  "(function(){return document._s3result||'_s3result not set';})()" \
  2)

# Step 4: Continue after App ID
S4=$(run_step "S4 Continue2" \
  "(function(){var bs=document.querySelectorAll('button');for(var i=0;i<bs.length;i++){if(bs[i].textContent.trim()==='Continue'&&!bs[i].disabled){bs[i].click();return 'Continue2';}}return 'No Continue2. Btns:'+Array.prototype.map.call(bs,function(b){return b.textContent.trim();}).join(',');})()" \
  7)

# Step 5: Select Distribution certificate
S5=$(run_step "S5 Cert" \
  "(function(){var rows=Array.prototype.slice.call(document.querySelectorAll('tr,li'));for(var i=0;i<rows.length;i++){var t=rows[i].textContent;if(t.indexOf('Apple Distribution')>=0){var inp=rows[i].querySelector('input[type=checkbox],input[type=radio]');if(inp){inp.click();return 'Cert selected';}rows[i].click();return 'Cert clicked';}}for(var j=0;j<rows.length;j++){var t2=rows[j].textContent;if(t2.indexOf('Distribution')>=0&&t2.indexOf('Ad Hoc')<0){var inp2=rows[j].querySelector('input');if(inp2){inp2.click();return 'Distribution cert fallback';}}}return 'No dist cert. Sample:'+rows.slice(0,3).map(function(r){return r.textContent.trim().substring(0,25);}).join('|');})()" \
  3)

# Step 6: Continue after cert
S6=$(run_step "S6 Continue3" \
  "(function(){var bs=document.querySelectorAll('button');for(var i=0;i<bs.length;i++){if(bs[i].textContent.trim()==='Continue'&&!bs[i].disabled){bs[i].click();return 'Continue3';}}return 'No Continue3. Btns:'+Array.prototype.map.call(bs,function(b){return b.textContent.trim();}).join(',');})()" \
  7)

# Step 7: Enter profile name
S7=$(run_step "S7 Name" \
  "(function(){var inputs=document.querySelectorAll('input[type=text],input:not([type])');for(var i=0;i<inputs.length;i++){if(!inputs[i].readOnly&&!inputs[i].disabled){inputs[i].value='AethonBeacon AppStore Distribution';inputs[i].dispatchEvent(new Event('input',{bubbles:true}));inputs[i].dispatchEvent(new Event('change',{bubbles:true}));return 'Name entered';}}return 'No text input. Title:'+document.title;})()" \
  2)

# Step 8: Click Generate
S8=$(run_step "S8 Generate" \
  "(function(){var bs=document.querySelectorAll('button');for(var i=0;i<bs.length;i++){if(bs[i].textContent.trim()==='Generate'&&!bs[i].disabled){bs[i].click();return 'Clicked Generate';}}for(var j=0;j<bs.length;j++){if(bs[j].textContent.trim()==='Continue'&&!bs[j].disabled){bs[j].click();return 'Clicked Continue(gen)';}}return 'No Generate/Continue. Btns:'+Array.prototype.map.call(bs,function(b){return b.textContent.trim();}).join(',');})()" \
  12)

# Step 9: Click Download
S9=$(run_step "S9 Download" \
  "(function(){var elems=document.querySelectorAll('button,a');for(var i=0;i<elems.length;i++){var t=elems[i].textContent.trim().toLowerCase();var h=elems[i].href||'';if(t==='download'||h.indexOf('.mobileprovision')>=0){elems[i].click();return 'Download clicked';}}var bs=document.querySelectorAll('button');return 'No download. Btns:'+Array.prototype.map.call(bs,function(b){return b.textContent.trim();}).join(',')+' Title:'+document.title;})()" \
  10)

# ============================================================
# PHASE 6: Install profile + archive
# ============================================================
PROFILE=$(ls -t ~/Downloads/*.mobileprovision 2>/dev/null | head -1)
if [ -z "$PROFILE" ]; then
  echo "No .mobileprovision in Downloads." | tee -a "$LOG"
  ls ~/Downloads/ | tail -20 | tee -a "$LOG"
  CURURL=$(osascript -e 'tell application "Safari" to get URL of front document' 2>&1)
  echo "Safari URL: $CURURL" | tee -a "$LOG"
  cat "$LOG"
  exit 1
fi

echo "Profile: $PROFILE" | tee -a "$LOG"
UUID=$(security cms -D -i "$PROFILE" 2>/dev/null | plutil -extract UUID raw - 2>/dev/null)
echo "UUID: $UUID" | tee -a "$LOG"

if [ -z "$UUID" ]; then
  echo "ERROR: Could not extract UUID" | tee -a "$LOG"
  cat "$LOG"
  exit 1
fi

mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles/
cp "$PROFILE" ~/Library/MobileDevice/Provisioning\ Profiles/${UUID}.mobileprovision
echo "Profile installed!" | tee -a "$LOG"

# Archive
echo "" | tee -a "$LOG"
echo "=== Running xcodebuild archive ===" | tee -a "$LOG"
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
  PROVISIONING_PROFILE_SPECIFIER="$UUID" \
  2>&1 | tee -a "$LOG"

echo "Archive exists: $([ -d /tmp/AethonBeacon.xcarchive ] && echo YES || echo NO)" | tee -a "$LOG"

if [ ! -d /tmp/AethonBeacon.xcarchive ]; then
  echo "ERROR: Archive failed" | tee -a "$LOG"
  cat "$LOG"
  exit 1
fi

# Export IPA
echo "" | tee -a "$LOG"
echo "=== Exporting IPA ===" | tee -a "$LOG"
rm -rf /tmp/AethonBeaconIPA

cat > ~/AethonBeacon/ios/exportOptions.plist << 'PLIST'
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
    <string>AethonBeacon AppStore Distribution</string>
  </dict>
  <key>destination</key>
  <string>export</string>
</dict>
</plist>
PLIST

xcodebuild -exportArchive \
  -archivePath /tmp/AethonBeacon.xcarchive \
  -exportPath /tmp/AethonBeaconIPA \
  -exportOptionsPlist ~/AethonBeacon/ios/exportOptions.plist \
  2>&1 | tee -a "$LOG"

IPA=$(find /tmp/AethonBeaconIPA -name "*.ipa" 2>/dev/null | head -1)
echo "IPA: $IPA" | tee -a "$LOG"

if [ -n "$IPA" ]; then
  cp "$IPA" ~/AethonBeacon/AethonBeacon.ipa
  echo "" | tee -a "$LOG"
  echo "=== SUCCESS: IPA at ~/AethonBeacon/AethonBeacon.ipa ===" | tee -a "$LOG"
  echo "Upload to TestFlight via Xcode Organizer or Transporter." | tee -a "$LOG"
else
  echo "IPA export failed. Check log above." | tee -a "$LOG"
fi

echo "=== COMPLETE ===" | tee -a "$LOG"
cat "$LOG"
