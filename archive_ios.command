#!/bin/bash
cd ~/AethonBeacon

echo ""
echo "==========================================="
echo "  NAYIQ — iOS Archive (Direct)"
echo "==========================================="

# Clean old archive
rm -rf /tmp/AethonBeacon.xcarchive

echo ""
echo "==> Archiving (Automatic signing, team DD3GZBF2N9)..."
echo "    This will create Distribution certificate if needed."
echo ""

xcodebuild \
  -workspace ios/AethonBeacon.xcworkspace \
  -scheme AethonBeacon \
  -sdk iphoneos \
  -configuration Release \
  -archivePath /tmp/AethonBeacon.xcarchive \
  archive \
  DEVELOPMENT_TEAM=DD3GZBF2N9 \
  CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates \
  -allowProvisioningDeviceRegistration \
  2>&1 | tee /tmp/archive_full.log | grep -E "error:|warning:.*sign|Archive|FAILED|succeeded|BUILD|provisioning|signing|Compiling|note:.*sign|Generating|Creating"

echo ""
if [ -d "/tmp/AethonBeacon.xcarchive" ]; then
  echo "ARCHIVE SUCCEEDED!"
  echo ""
  echo "==> Exporting IPA for App Store..."
  xcodebuild \
    -exportArchive \
    -archivePath /tmp/AethonBeacon.xcarchive \
    -exportPath /tmp/AethonBeacon_IPA \
    -exportOptionsPlist ~/AethonBeacon/ios/exportOptions.plist \
    -allowProvisioningUpdates \
    2>&1 | tee -a /tmp/archive_full.log | grep -E "error:|EXPORT|succeeded|FAILED|Exported|IPA"
  echo ""
  echo "IPA location: /tmp/AethonBeacon_IPA/"
  ls /tmp/AethonBeacon_IPA/ 2>/dev/null
else
  echo "ARCHIVE FAILED --- last errors:"
  grep -E "error:" /tmp/archive_full.log | tail -20
fi

echo ""
echo "Full log: /tmp/archive_full.log"
echo "==========================================="
