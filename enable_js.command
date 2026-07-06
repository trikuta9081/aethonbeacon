#!/bin/bash
# Enable Allow JavaScript from Apple Events in Safari

echo "=== Enabling Allow JavaScript from Apple Events ==="

# Method 1: Use defaults write (works even when Safari isn't running or Develop menu isn't enabled)
defaults write com.apple.Safari AllowJavaScriptFromAppleEvents 1
echo "defaults write done"

# Method 2: Also try via Develop menu if it exists
osascript << 'DONE'
tell application "Safari"
  activate
  delay 1
end tell

tell application "System Events"
  tell process "Safari"
    -- Check if Develop menu exists
    set menuBar to menu bar 1
    set allMenus to every menu bar item of menuBar
    set menuNames to {}
    repeat with m in allMenus
      set end of menuNames to name of m
    end repeat
    set menuNamesStr to menuNames as string

    if "Develop" is in menuNamesStr then
      tell menu bar item "Develop" of menuBar
        tell menu "Develop"
          -- Check and enable Allow JavaScript from Apple Events
          try
            set javaScriptMenuItem to menu item "Allow JavaScript from Apple Events"
            set markChar to value of attribute "AXMenuItemMarkChar" of javaScriptMenuItem
            if markChar is "" or markChar is missing value then
              click javaScriptMenuItem
              return "Enabled via Develop menu"
            else
              return "Already enabled (checkmark present)"
            end if
          on error e
            return "Error: " & e
          end try
        end tell
      end tell
    else
      -- Need to enable Develop menu first via Safari Settings
      return "Develop menu not found. Available: " & menuNamesStr
    end if
  end tell
end tell
DONE

echo "osascript done"

# Verify the setting
VALUE=$(defaults read com.apple.Safari AllowJavaScriptFromAppleEvents 2>/dev/null)
echo "AllowJavaScriptFromAppleEvents = $VALUE"

echo ""
echo "Now testing do JavaScript..."
RESULT=$(osascript -e 'tell application "Safari" to tell front document to do JavaScript "document.title"' 2>&1)
echo "Test result: $RESULT"
