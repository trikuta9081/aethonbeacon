#!/bin/bash
# Direct Python plist modification to enable Safari Develop menu + JS from Apple Events
LOG="$HOME/AethonBeacon/patch_log.txt"
echo "=== Direct plist patch ===" > "$LOG"
date >> "$LOG"

# Step 1: Find the plist
echo "Finding Safari plist..." | tee -a "$LOG"
PLIST=$(find "$HOME/Library" -name "com.apple.Safari.plist" 2>/dev/null | grep -v ".bak" | head -1)
echo "Plist: $PLIST" | tee -a "$LOG"

# Step 2: Quit Safari
echo "Quitting Safari..." | tee -a "$LOG"
osascript -e 'tell application "Safari" to quit' 2>&1 | tee -a "$LOG"
sleep 3

# Step 3: Kill cfprefsd to release plist lock
echo "Killing cfprefsd..." | tee -a "$LOG"
killall cfprefsd 2>/dev/null | tee -a "$LOG"
sleep 2

# Step 4: Patch plist with Python
echo "Patching plist with Python..." | tee -a "$LOG"
python3 << PYEOF 2>&1 | tee -a "$LOG"
import plistlib, os, sys

home = os.path.expanduser("~")
plist_paths = [
    os.path.join(home, "Library/Containers/com.apple.Safari/Data/Library/Preferences/com.apple.Safari.plist"),
    os.path.join(home, "Library/Preferences/com.apple.Safari.plist"),
]

patched = False
for path in plist_paths:
    if os.path.exists(path):
        print(f"Found: {path}")
        print(f"Size: {os.path.getsize(path)} bytes")
        try:
            with open(path, 'rb') as f:
                data = plistlib.load(f)

            # Enable Develop menu and JavaScript from Apple Events
            data['WebKitDeveloperExtras'] = True
            data['AllowJavaScriptFromAppleEvents'] = True
            data['ShowDevelopMenu'] = True

            # Back up original
            import shutil
            shutil.copy2(path, path + '.bak')

            # Write modified plist
            with open(path, 'wb') as f:
                plistlib.dump(data, f)

            print(f"SUCCESS: Patched {path}")
            print(f"WebKitDeveloperExtras = {data.get('WebKitDeveloperExtras')}")
            print(f"AllowJavaScriptFromAppleEvents = {data.get('AllowJavaScriptFromAppleEvents')}")
            patched = True
            break
        except Exception as e:
            print(f"ERROR patching {path}: {e}")
    else:
        print(f"Not found: {path}")

if not patched:
    print("No plist found to patch!")
    # Try listing all Safari-related plists
    import subprocess
    result = subprocess.run(['find', home + '/Library', '-name', '*Safari*', '-name', '*.plist'],
                          capture_output=True, text=True)
    print("Safari plists found:")
    print(result.stdout)
PYEOF

# Step 5: Verify patch
echo "" | tee -a "$LOG"
echo "Verifying patch..." | tee -a "$LOG"
python3 -c "
import plistlib, os
path = os.path.expanduser('~/Library/Containers/com.apple.Safari/Data/Library/Preferences/com.apple.Safari.plist')
if os.path.exists(path):
    with open(path, 'rb') as f:
        d = plistlib.load(f)
    print('AllowJavaScriptFromAppleEvents:', d.get('AllowJavaScriptFromAppleEvents', 'NOT SET'))
    print('WebKitDeveloperExtras:', d.get('WebKitDeveloperExtras', 'NOT SET'))
    print('ShowDevelopMenu:', d.get('ShowDevelopMenu', 'NOT SET'))
else:
    print('Plist not found at container path')
" 2>&1 | tee -a "$LOG"

# Step 6: Relaunch Safari
echo "" | tee -a "$LOG"
echo "Relaunching Safari..." | tee -a "$LOG"
open -a Safari "https://developer.apple.com/account/resources/profiles/add"
sleep 10

# Step 7: Test do JavaScript and check Develop menu
echo "Testing do JavaScript..." | tee -a "$LOG"
JSTEST=$(osascript -e 'tell application "Safari" to tell front document to do JavaScript "document.title"' 2>&1)
echo "JS Test: $JSTEST" | tee -a "$LOG"

if [[ "$JSTEST" != *"error"* ]]; then
  echo "" | tee -a "$LOG"
  echo "SUCCESS! do JavaScript works now!" | tee -a "$LOG"
  echo "Proceeding with profile creation automation..." | tee -a "$LOG"

  sleep 5  # Wait for portal to fully load

  # Automate profile creation
  RESULT=$(osascript << 'APPLESCRIPT'
tell application "Safari"
  tell front document
    -- Wait and check page
    delay 2
    set pageTitle to do JavaScript "document.title"

    -- Find all radio buttons
    set radios to do JavaScript "JSON.stringify(Array.from(document.querySelectorAll('input[type=radio]')).map(r => ({id:r.id, value:r.value, name:r.name})))"

    -- Select App Store (value="store")
    set clickResult to do JavaScript "
      var r = Array.from(document.querySelectorAll('input[type=radio]')).find(x => x.value === 'store');
      if (r) { r.click(); return 'Selected App Store'; }
      return 'Not found. Radios: ' + JSON.stringify(Array.from(document.querySelectorAll('input[type=radio]')).map(x => x.value));
    "

    return "Title: " & pageTitle & " | Radios: " & radios & " | Click: " & clickResult
  end tell
end tell
APPLESCRIPT
)
  echo "Portal interaction: $RESULT" | tee -a "$LOG"
else
  echo "" | tee -a "$LOG"
  echo "do JavaScript STILL blocked. Checking Develop menu visibility..." | tee -a "$LOG"
  osascript -e '
tell application "System Events"
  tell process "Safari"
    set menuNames to name of every menu bar item of menu bar 1
    return menuNames as string
  end tell
end tell
' 2>&1 | tee -a "$LOG"
fi

echo "" | tee -a "$LOG"
echo "=== LOG ===" | tee -a "$LOG"
cat "$LOG"
