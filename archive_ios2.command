#!/bin/bash
cd ~/AethonBeacon
rm -rf /tmp/AethonBeacon.xcarchive
LOG=~/AethonBeacon/archive_log.txt
echo "Starting archive (Automatic signing, team 846YFF8Z98, allowProvisioningUpdates)..." > "$LOG"
xcodebuild \
  -workspace ios/AethonBeacon.xcworkspace \
  -scheme AethonBeacon \
  -sdk iphoneos \
  -configuration Release \
  -archivePath /tmp/AethonBeacon.xcarchive \
  archive \
  DEVELOPMENT_TEAM=846YFF8Z98 \
  CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates \
  -allowProvisioningDeviceRegistration \
  2>&1 | tee -a "$LOG"
echo ""
echo "LOG SAVED TO: $LOG"
echo "Archive exists: $([ -d /tmp/AethonBeacon.xcarchive ] && echo YES || echo NO)"
