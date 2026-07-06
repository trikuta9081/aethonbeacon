#!/bin/bash
cd ~/AethonBeacon

echo ""
echo "==========================================="
echo "  Aethon Beacon — iOS Archive via Xcode"
echo "==========================================="

echo ""
echo "==> Updating CocoaPods ..."
cd ios && pod install 2>&1 | tail -5 && cd ..

echo ""
echo "==> Archiving for App Store ..."
xcodebuild \
  -workspace ios/AethonBeacon.xcworkspace \
  -scheme AethonBeacon \
  -sdk iphoneos \
  -configuration Release \
  -archivePath /tmp/AethonBeacon.xcarchive \
  archive \
  DEVELOPMENT_TEAM=DD3GZBF2N9 \
  -allowProvisioningUpdates \
  2>&1 | grep -E "error:|Archive|FAILED|succeeded|BUILD|provisioning|signing|Compiling"

echo ""
if [ -d "/tmp/AethonBeacon.xcarchive" ]; then
  echo "Archive succeeded!"
  echo ""
  echo "==> Exporting IPA for App Store ..."
  xcodebuild \
    -exportArchive \
    -archivePath /tmp/AethonBeacon.xcarchive \
    -exportPath /tmp/AethonBeacon_IPA \
    -exportOptionsPlist ~/AethonBeacon/ios/exportOptions.plist \
    -allowProvisioningUpdates \
    2>&1 | grep -E "error:|EXPORT|succeeded|FAILED|Exported"
  echo ""
  echo "IPA location: /tmp/AethonBeacon_IPA/"
  ls /tmp/AethonBeacon_IPA/ 2>/dev/null
else
  echo "Archive not found — check errors above."
fi

echo ""
echo "==========================================="
echo "  Done!"
echo "==========================================="
