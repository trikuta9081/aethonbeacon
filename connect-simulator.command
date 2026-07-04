#!/bin/bash
echo "=== Connecting AethonBeacon to Metro ==="

URL="aethonbeacon://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
DEVICES=$(xcrun simctl list devices booted | grep "Booted" | grep -oE "[0-9A-F-]{36}")

if [ -z "$DEVICES" ]; then
  echo "No booted simulator found. Open Simulator, boot an iPhone, then run this again."
  read -p "Press Enter to close..."
  exit 1
fi

for DEVICE in $DEVICES; do
  echo "Opening dev client on simulator $DEVICE..."
  xcrun simctl openurl "$DEVICE" "$URL" 2>&1 && echo "✅ Opened $DEVICE" || echo "❌ Failed $DEVICE"
done

echo ""
echo "Done — check the simulator!"
read -p "Press Enter to close..."
