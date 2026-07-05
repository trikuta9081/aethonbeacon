#!/bin/bash
set -e

echo ""
echo "=================================================="
echo " AethonBeacon iOS Archive Build"
echo "=================================================="
echo ""

# Push any pending commits first
cd ~/AethonBeacon
echo "==> Pushing pending git commits..."
git push origin master 2>&1 || echo "    (push failed or nothing to push)"
git push render master 2>&1 || echo "    (render push failed)"

echo ""
echo "==> Starting xcodebuild archive..."
cd ~/AethonBeacon/ios

xcodebuild \
  -workspace AethonBeacon.xcworkspace \
  -scheme AethonBeacon \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath ~/Desktop/AethonBeacon_v1.0.2.xcarchive \
  archive \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM=846YFF8Z98 \
  CODE_SIGN_STYLE=Automatic \
  2>&1 | tail -80

echo ""
echo "==> Archive done! Opening Xcode Organizer..."
open ~/Desktop/AethonBeacon_v1.0.2.xcarchive

echo ""
echo "In Xcode Organizer:"
echo "  1. Select AethonBeacon_v1.0.2"
echo "  2. Click 'Distribute App'"
echo "  3. Choose 'App Store Connect' or 'Ad Hoc'"
echo "  4. Follow the prompts"
echo ""
echo "=================================================="
echo " Done!"
echo "=================================================="
