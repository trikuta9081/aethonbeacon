#!/bin/bash
echo "=== Connecting AethonBeacon to Metro ==="

# Both booted devices — try both
DEVICE1="5D0753C5-A69C-4808-8BE1-4D24DD8D1505"
DEVICE2="5CB63C01-E35A-4F3B-9776-7DA37950849D"

URL="aethonbeacon://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"

echo "Trying device 1 (5D075...)..."
xcrun simctl openurl "$DEVICE1" "$URL" 2>&1 && echo "✅ Device 1 opened!" || echo "❌ Device 1 failed"

echo ""
echo "Trying device 2 (5CB63...)..."
xcrun simctl openurl "$DEVICE2" "$URL" 2>&1 && echo "✅ Device 2 opened!" || echo "❌ Device 2 failed"

echo ""
echo "Done — check the simulator!"
read -p "Press Enter to close..."
