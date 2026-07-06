#!/bin/bash
# Full pipeline: enable Safari developer JS, create provisioning profile, archive + export IPA

LOG="$HOME/AethonBeacon/safari_dev_log.txt"
echo "=== Safari Dev + Profile Creation ===" > "$LOG"
date >> "$LOG"

# ============================================================
# PHASE 1: Navigate Safari to profile page
# ============================================================
echo "Phase 1: Navigating Safari to profile creation page..." | tee -a "$LOG"
osascript << 'DONE'
tell application "Safari"
  activate
end tell
DONE
sleep 2

# Check if Develop menu already exists
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
        -- List all windows
        set winList to {}
        repeat with w in windows
          set end of winList to name of w
        end repeat

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

        -- List buttons in window
        set btns to {}
        try
          set allBtns to buttons of toolbar 1 of window 1
          repeat with b in allBtns
            try
              set end of btns to name of b
            end try
          end repeat
        end try
        return "Windows: " & (winList as string) & " | Toolbar buttons: " & (btns as string)
      on error e
        return "Error: " & e
      end try
    end tell
  end tell
DONE
  )
  echo "Advanced tab: $ADV" | tee -a "$LOG"
  sleep 2

  # Enable developer checkbox - search all UI elements
  CBRESULT=$(osascript << 'DONE'
  tell application "System Events"
    tell process "Safari"
      try
        -- Search entire window contents for developer checkbox
        set allElems to entire contents of window 1
        set found to false
        repeat with elem in allElems
          try
            if class of elem is checkbox then
              set cbTitle to title of elem
              if (cbTitle contains "developer" or cbTitle contains "Developer" or cbTitle contains "web") then
                if value of elem is 0 then
                  click elem
                  set found to true
                  return "Enabled checkbox: " & cbTitle
                else
                  set found to true
                  return "Already enabled: " & cbTitle
                end if
              end if
            end if
          end try
        end repeat

        -- List all checkboxes
        set cbList to {}
        repeat with elem in allElems
          try
            if class of elem is checkbox then
              set end of cbList to (title of elem)
            end if
          end try
        end repeat
        return "Checkboxes found: " & (cbList as string)
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
# ============================================================
echo "Phase 3: Enabling Allow JS from Apple Events..." | tee -a "$LOG"
JSALLOW=$(osascript << 'DONE'
tell application "System Events"
  tell process "Safari"
    try
      -- List Develop menu items to find the right one
      set devItems to name of every menu item of menu "Develop" of menu bar 1
      set devStr to devItems as string

      -- Click Allow JavaScript from Apple Events
      try
        click menu item "Allow JavaScript from Apple Events" of menu "Develop" of menu bar 1
        return "Clicked Allow JS | All items: " & devStr
      on error e2
        return "Could not click: " & e2 & " | Items: " & devStr
      end try
    on error e
      return "Error accessing Develop menu: " & e
    end try
  end tell
end tell
DONE
)
echo "JS Allow result: $JSALLOW" | tee -a "$LOG"
sleep 2

# ============================================================
# PHASE 4: Test do JavaScript
# ============================================================
echo "Phase 4: Testing do JavaScript..." | tee -a "$LOG"
JSTEST=$(osascript -e 'tell application "Safari" to tell front document to do JavaScript "document.title"' 2>&1)
echo "JS Test: $JSTEST" | tee -a "$LOG"

if echo "$JSTEST" | grep -iq "must enable\|error.*8\b"; then
  echo "ERROR: do JavaScript still blocked!" | tee -a "$LOG"
  echo "Current URL: $(osascript -e 'tell application "Safari" to get URL of front document' 2>&1)" | tee -a "$LOG"
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
# PHASE 5: Automate profile creation form
# ============================================================
echo "Phase 5: Creating provisioning profile..." | tee -a "$LOG"

RESULT=$(osascript << 'DONE'
tell application "Safari"
  activate
  tell front document
    set pageTitle to do JavaScript "document.title"

    -- Step 1: Select App Store
    set r1 to do JavaScript "
      var radios = document.querySelectorAll('input[type=radio]');
      var as = Array.from(radios).find(r => r.value === 'store');
      if (as) { as.click(); return 'Selected App Store (store)'; }
      return 'Radios:' + radios.length + ' vals:' + Array.from(radios).map(r=>r.value).join(',');
    "
    delay 2

    -- Step 2: Continue
    set r2 to do JavaScript "
      var btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Continue' && !b.disabled);
      if (btn) { btn.click(); return 'Clicked Continue'; }
      return 'Btns:' + Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim()).join(',');
    "
    delay 7

    -- Step 3: Select App ID com.aethon.beacon
    set r3 to do JavaScript "
      var items = Array.from(document.querySelectorAll('li, tr, [class*=item], [class*=row], label'));
      var found = items.find(i => i.textContent.includes('com.aethon.beacon'));
      if (found) {
        var radio = found.querySelector('input');
        if (radio) { radio.click(); return 'Clicked radio for com.aethon.beacon'; }
        found.click();
        return 'Clicked element for com.aethon.beacon';
      }
      var sel = document.querySelector('select');
      if (sel) {
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].text.includes('com.aethon') || sel.options[i].value.includes('com.aethon')) {
            sel.selectedIndex = i;
            sel.dispatchEvent(new Event('change', {bubbles:true}));
            return 'Select dropdown: com.aethon.beacon';
          }
        }
        return 'Select present, no aethon option. Total:' + sel.options.length;
      }
      return 'Not found. Title:' + document.title;
    "
    delay 3

    -- Step 4: Continue
    set r4 to do JavaScript "
      var btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Continue' && !b.disabled);
      if (btn) { btn.click(); return 'Continue(2)'; }
      return 'No Continue(2)';
    "
    delay 7

    -- Step 5: Select Distribution cert
    set r5 to do JavaScript "
      var items = Array.from(document.querySelectorAll('tr, li, [class*=item], [class*=row]'));
      var cert = items.find(i => i.textContent.includes('Apple Distribution'));
      if (!cert) cert = items.find(i => i.textContent.includes('Distribution') && !i.textContent.includes('Ad Hoc'));
      if (cert) {
        var inp = cert.querySelector('input[type=checkbox], input[type=radio]');
        if (inp) { inp.click(); return 'Selected cert input'; }
        cert.click();
        return 'Clicked cert';
      }
      return 'No dist cert. Sample:' + items.slice(0,4).map(i=>i.textContent.trim().substring(0,40)).join('|');
    "
    delay 3

    -- Step 6: Continue
    set r6 to do JavaScript "
      var btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Continue' && !b.disabled);
      if (btn) { btn.click(); return 'Continue(3)'; }
      return 'No Continue(3)';
    "
    delay 7

    -- Step 7: Enter profile name
    set r7 to do JavaScript "
      var inp = Array.from(document.querySelectorAll('input[type=text], input:not([type])')).find(i => !i.readOnly && !i.disabled);
      if (inp) {
        inp.value = 'AethonBeacon AppStore Distribution';
        inp.dispatchEvent(new Event('input', {bubbles:true}));
        inp.dispatchEvent(new Event('change', {bubbles:true}));
        return 'Name entered';
      }
      return 'No text input. Title:' + document.title;
    "
    delay 2

    -- Step 8: Generate
    set r8 to do JavaScript "
      var btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Generate' && !b.disabled);
      if (!btn) btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Continue' && !b.disabled);
      if (btn) { btn.click(); return 'Clicked: ' + btn.textContent.trim(); }
      return 'No Generate/Continue. Btns:' + Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim()).join(',');
    "
    delay 12

    -- Step 9: Download
    set r9 to do JavaScript "
      var btn = Array.from(document.querySelectorAll('button, a')).find(b =>
        b.textContent.trim().toLowerCase() === 'download' ||
        (b.href && b.href.includes('.mobileprovision')));
      if (btn) { btn.click(); return 'Download clicked!'; }
      return 'No download. Btns:' + Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim()).join(',') + ' | Title:' + document.title;
    "

    return "page=" & pageTitle & " | r1=" & r1 & " | r2=" & r2 & " | r3=" & r3 & " | r4=" & r4 & " | r5=" & r5 & " | r6=" & r6 & " | r7=" & r7 & " | r8=" & r8 & " | r9=" & r9
  end tell
end tell
DONE
)
echo "Portal result: $RESULT" | tee -a "$LOG"

sleep 10

# ============================================================
# PHASE 6: Install profile + archive
# ============================================================
PROFILE=$(ls -t ~/Downloads/*.mobileprovision 2>/dev/null | head -1)
if [ -z "$PROFILE" ]; then
  echo "No .mobileprovision in Downloads. Checking..." | tee -a "$LOG"
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

# Update exportOptions.plist to use manual signing with profile
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
  echo "=== SUCCESS: IPA saved to ~/AethonBeacon/AethonBeacon.ipa ===" | tee -a "$LOG"
  echo "Uploading to TestFlight..." | tee -a "$LOG"

  xcrun altool --upload-app \
    --type ios \
    --file "$IPA" \
    --username slathiarimple567@gmail.com \
    --password "@keychain:Application Loader: slathiarimple567@gmail.com" \
    2>&1 | tee -a "$LOG" || \
  xcrun altool --upload-app \
    --type ios \
    --file "$IPA" \
    --apiKey "" \
    2>&1 | tee -a "$LOG" || \
  echo "Manual upload needed via Transporter or Xcode Organizer" | tee -a "$LOG"
else
  echo "IPA export failed" | tee -a "$LOG"
fi

echo "=== COMPLETE ===" | tee -a "$LOG"
cat "$LOG"
