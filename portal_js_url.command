#!/bin/bash
# Use Safari javascript: URL scheme to interact with the Apple Developer Portal
# This bypasses the "Allow JavaScript from Apple Events" requirement!
LOG="$HOME/AethonBeacon/portal_js_log.txt"
echo "=== Portal automation via javascript: URL ===" > "$LOG"
date >> "$LOG"

# First make sure Safari is open at the profile creation page
echo "Navigating to profile creation page..." | tee -a "$LOG"
osascript -e 'tell application "Safari" to open location "https://developer.apple.com/account/resources/profiles/add"'
sleep 8

echo "Checking current page..." | tee -a "$LOG"
PAGE=$(osascript -e 'tell application "Safari" to get name of front document' 2>&1)
echo "Page: $PAGE" | tee -a "$LOG"
URL=$(osascript -e 'tell application "Safari" to get URL of front document' 2>&1)
echo "URL: $URL" | tee -a "$LOG"

# Step 1: Select App Store distribution via javascript: URL
echo "" | tee -a "$LOG"
echo "Step 1: Selecting App Store via javascript: URL..." | tee -a "$LOG"
osascript -e 'tell application "Safari" to open location "javascript:void((function(){var r=document.querySelectorAll(\"input[type=radio]\");var as=Array.from(r).find(x=>x.value===\"store\");if(as){as.click();alert(\"Selected App Store\");}else{alert(\"Not found. Count:\"+r.length+\" Values:\"+Array.from(r).map(x=>x.value).join(\",\"));}})())"'
sleep 3

echo "Step 2: Clicking Continue..." | tee -a "$LOG"
osascript -e 'tell application "Safari" to open location "javascript:void((function(){var btn=Array.from(document.querySelectorAll(\"button\")).find(b=>b.textContent.trim()===\"Continue\"&&!b.disabled);if(btn){btn.click();}else{alert(\"No Continue button. Buttons:\"+Array.from(document.querySelectorAll(\"button\")).map(b=>b.textContent.trim()).join(\",\"));}})())"'
sleep 6

echo "Step 3: Selecting App ID..." | tee -a "$LOG"
osascript -e 'tell application "Safari" to open location "javascript:void((function(){var items=Array.from(document.querySelectorAll(\"li,tr,[class*=item],[class*=row]\"));var found=items.find(i=>i.textContent.includes(\"com.aethon.beacon\"));if(found){var radio=found.querySelector(\"input\");if(radio)radio.click();else found.click();alert(\"Selected App ID\");}else{var sel=document.querySelector(\"select\");if(sel){for(var i=0;i<sel.options.length;i++){if(sel.options[i].text.includes(\"com.aethon.beacon\")){sel.selectedIndex=i;sel.dispatchEvent(new Event(\"change\",{bubbles:true}));alert(\"Dropdown selected\");return;}}}alert(\"App ID not found. Page:\"+document.title);}})())"'
sleep 3

echo "Step 4: Continue after App ID..." | tee -a "$LOG"
osascript -e 'tell application "Safari" to open location "javascript:void((function(){var btn=Array.from(document.querySelectorAll(\"button\")).find(b=>b.textContent.trim()===\"Continue\"&&!b.disabled);if(btn)btn.click();else alert(\"No Continue after App ID\");})())"'
sleep 6

echo "Step 5: Selecting Distribution Certificate..." | tee -a "$LOG"
osascript -e 'tell application "Safari" to open location "javascript:void((function(){var items=Array.from(document.querySelectorAll(\"tr,li,[class*=item],[class*=row]\"));var cert=items.find(i=>i.textContent.includes(\"Distribution\"));if(cert){var inp=cert.querySelector(\"input\");if(inp)inp.click();else cert.click();alert(\"Selected cert\");}else{alert(\"No dist cert found. Page:\"+document.title);}})())"'
sleep 3

echo "Step 6: Continue after cert..." | tee -a "$LOG"
osascript -e 'tell application "Safari" to open location "javascript:void((function(){var btn=Array.from(document.querySelectorAll(\"button\")).find(b=>b.textContent.trim()===\"Continue\"&&!b.disabled);if(btn)btn.click();else alert(\"No Continue after cert\");})())"'
sleep 6

echo "Step 7: Entering profile name..." | tee -a "$LOG"
osascript -e 'tell application "Safari" to open location "javascript:void((function(){var inp=Array.from(document.querySelectorAll(\"input[type=text],input:not([type])\")).find(i=>!i.readOnly&&!i.disabled);if(inp){inp.value=\"AethonBeacon AppStore Distribution\";inp.dispatchEvent(new Event(\"input\",{bubbles:true}));inp.dispatchEvent(new Event(\"change\",{bubbles:true}));alert(\"Name entered\");}else{alert(\"No text input. Page:\"+document.title);}})())"'
sleep 2

echo "Step 8: Clicking Generate..." | tee -a "$LOG"
osascript -e 'tell application "Safari" to open location "javascript:void((function(){var btn=Array.from(document.querySelectorAll(\"button\")).find(b=>(b.textContent.trim()===\"Generate\"||b.textContent.trim()===\"Continue\")&&!b.disabled);if(btn){btn.click();alert(\"Clicked \"+btn.textContent.trim());}else{alert(\"No Generate. Buttons:\"+Array.from(document.querySelectorAll(\"button\")).map(b=>b.textContent.trim()).join(\",\"));}})())"'
sleep 10

echo "Step 9: Downloading profile..." | tee -a "$LOG"
osascript -e 'tell application "Safari" to open location "javascript:void((function(){var btn=Array.from(document.querySelectorAll(\"button,a\")).find(b=>b.textContent.trim().toLowerCase()===\"download\"||(b.href&&b.href.includes(\".mobileprovision\")));if(btn){btn.click();alert(\"Download clicked!\");}else{alert(\"No download. Page:\"+document.title+\" Buttons:\"+Array.from(document.querySelectorAll(\"button\")).map(b=>b.textContent.trim()).join(\",\"));}})())"'
sleep 8

# Check for downloaded profile
echo "" | tee -a "$LOG"
echo "Checking Downloads..." | tee -a "$LOG"
PROFILE=$(ls -t ~/Downloads/*.mobileprovision 2>/dev/null | head -1)
if [ -n "$PROFILE" ]; then
  echo "Profile found: $PROFILE" | tee -a "$LOG"
  UUID=$(security cms -D -i "$PROFILE" 2>/dev/null | plutil -extract UUID raw - 2>/dev/null)
  echo "UUID: $UUID" | tee -a "$LOG"
  mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles/
  cp "$PROFILE" ~/Library/MobileDevice/Provisioning\ Profiles/${UUID}.mobileprovision
  echo "Installed!" | tee -a "$LOG"

  # Update and run archive
  cat > ~/AethonBeacon/archive_ios2.command << ARCHEOF
#!/bin/bash
cd ~/AethonBeacon
rm -rf /tmp/AethonBeacon.xcarchive
LOG=~/AethonBeacon/archive_log.txt
echo "Starting archive with profile UUID: $UUID" > "\$LOG"
xcodebuild \\
  -workspace ios/AethonBeacon.xcworkspace \\
  -scheme AethonBeacon \\
  -sdk iphoneos \\
  -configuration Release \\
  -archivePath /tmp/AethonBeacon.xcarchive \\
  archive \\
  DEVELOPMENT_TEAM=846YFF8Z98 \\
  CODE_SIGN_STYLE=Manual \\
  "CODE_SIGN_IDENTITY=Apple Distribution" \\
  PROVISIONING_PROFILE_SPECIFIER=$UUID \\
  2>&1 | tee -a "\$LOG"
echo "Archive exists: \$([ -d /tmp/AethonBeacon.xcarchive ] && echo YES || echo NO)" | tee -a "\$LOG"
ARCHEOF
  chmod +x ~/AethonBeacon/archive_ios2.command
  echo "Archive command ready! Running now..." | tee -a "$LOG"
  ~/AethonBeacon/archive_ios2.command
else
  echo "No profile downloaded yet. Check Safari for any alert dialogs or form state." | tee -a "$LOG"
  PAGE2=$(osascript -e 'tell application "Safari" to get name of front document' 2>&1)
  URL2=$(osascript -e 'tell application "Safari" to get URL of front document' 2>&1)
  echo "Current page: $PAGE2" | tee -a "$LOG"
  echo "Current URL: $URL2" | tee -a "$LOG"
fi

echo "" | tee -a "$LOG"
echo "=== DONE ===" | tee -a "$LOG"
cat "$LOG"
