#!/bin/zsh
set -euxo pipefail

echo "== AethonBeacon Xcode Cloud pre-xcodebuild workspace warmup =="
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -f "${SCRIPT_DIR}/../package.json" ]]; then
  REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
else
  REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
fi
cd "${REPO_ROOT}"
export PATH="/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/opt/node@22/bin:/usr/local/opt/node@22/bin:/opt/homebrew/opt/node/bin:/usr/local/opt/node/bin:${PATH}"
export RUBYOPT="${RUBYOPT:-} -rlogger"

# Xcode Cloud workflow is currently archiving the .xcodeproj. Archive the
# CocoaPods workspace first, without signing, so the ArchiveIntermediates
# module maps/products exist before the managed archive step starts.
cd ios
# Xcode Cloud's managed archive uses /Volumes/workspace/DerivedData.
# If CI_DERIVED_DATA_PATH is not exported into this script, warm the same
# DerivedData location explicitly; otherwise the final archive starts without
# the CocoaPods module maps/products and fails during Swift bridging-header
# precompilation. Local runs fall back to /tmp.
if [[ -z "${CI_DERIVED_DATA_PATH:-}" ]]; then
  if [[ -d "/Volumes/workspace" ]]; then
    export CI_DERIVED_DATA_PATH="/Volumes/workspace/DerivedData"
  else
    export CI_DERIVED_DATA_PATH="/tmp/AethonBeacon-XcodeCloudWarmupDerivedData"
  fi
fi
echo "Using DerivedData warmup path: ${CI_DERIVED_DATA_PATH}"
rm -rf /tmp/AethonBeacon-XcodeCloudWarmup.xcarchive
xcodebuild \
  -derivedDataPath "${CI_DERIVED_DATA_PATH}" \
  -workspace AethonBeacon.xcworkspace \
  -scheme AethonBeacon \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath /tmp/AethonBeacon-XcodeCloudWarmup.xcarchive \
  CODE_SIGNING_ALLOWED=NO \
  archive

test -f "${CI_DERIVED_DATA_PATH}/Build/Intermediates.noindex/ArchiveIntermediates/AethonBeacon/BuildProductsPath/Release-iphoneos/ReachabilitySwift/Reachability.modulemap"
test -f "${CI_DERIVED_DATA_PATH}/Build/Intermediates.noindex/ArchiveIntermediates/AethonBeacon/BuildProductsPath/Release-iphoneos/ExpoHaptics/ExpoHaptics.modulemap"

echo "== Xcode Cloud workspace warmup complete =="
