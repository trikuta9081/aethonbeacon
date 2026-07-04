#!/bin/bash
# Build and install AethonBeacon dev client on the booted iOS Simulator

cd "$(dirname "$0")/ios"

echo "========================================="
echo "  Building AethonBeacon for Simulator"
echo "========================================="

# Get booted simulator UDID
UDID=$(xcrun simctl list devices booted | grep "Booted" | grep -oE "[0-9A-F-]{36}" | head -1)

if [ -z "$UDID" ]; then
  echo ""
  echo "No simulator is currently booted."
  echo "Booting iPhone 17 Pro simulator..."
  xcrun simctl boot "5D0753C5-B41A-47B0-A793-E31D7936C76E" 2>/dev/null || true
  sleep 3
  UDID=$(xcrun simctl list devices booted | grep "Booted" | grep -oE "[0-9A-F-]{36}" | head -1)
fi

echo "Target simulator: $UDID"
echo ""
echo "Building... (this takes 2-5 minutes)"
echo ""

xcodebuild \
  -workspace AethonBeacon.xcworkspace \
  -scheme AethonBeacon \
  -configuration Debug \
  -destination "id=$UDID" \
  -derivedDataPath build/DerivedData \
  build \
  2>&1 | grep -E "^(error:|warning:|Build succeeded|Build FAILED|Compiling|Linking|** BUILD)" | tail -30

echo ""
echo "Installing app on simulator..."
APP_PATH=$(find build/DerivedData -name "AethonBeacon.app" -maxdepth 10 2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
  echo "ERROR: Could not find built app. Check build output above."
  read -p "Press Enter to close..."
  exit 1
fi

echo "App found at: $APP_PATH"
xcrun simctl install "$UDID" "$APP_PATH"
echo ""
echo "✅ App installed! Launching..."
xcrun simctl launch "$UDID" com.aethon.beacon 2>/dev/null || \
xcrun simctl launch "$UDID" host.exp.Exponent 2>/dev/null || \
echo "Launch attempt done - check the simulator"

echo ""
echo "========================================="
echo "  Done! Check the iOS Simulator now."
echo "  If the Expo Dev Client appears,"
echo "  tap 'Enter URL manually' and type:"
echo "  exp://localhost:8081"
echo "========================================="
read -p "Press Enter to close..."
