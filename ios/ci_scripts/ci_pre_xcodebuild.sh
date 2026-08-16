#!/bin/zsh
set -euxo pipefail

# The Xcode Cloud workflow is currently managed from the iOS project. CocoaPods
# dependencies therefore need to be archived through the workspace before the
# managed archive starts. Crucially, both passes must use the same DerivedData
# directory; a normal warm-up build uses a separate cache and leaves the managed
# archive unable to import Expo on a clean worker.
echo "== AethonBeacon Xcode Cloud pre-xcodebuild workspace warmup =="

if [[ -n "${CI_PRIMARY_REPOSITORY_PATH:-}" ]]; then
  REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH}"
else
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
fi

cd "${REPO_ROOT}/ios"

if [[ -z "${CI_DERIVED_DATA_PATH:-}" ]]; then
  if [[ -d "/Volumes/workspace" ]]; then
    export CI_DERIVED_DATA_PATH="/Volumes/workspace/DerivedData"
  else
    export CI_DERIVED_DATA_PATH="/tmp/AethonBeacon-XcodeCloudWarmupDerivedData"
  fi
fi

echo "Workflow: ${CI_WORKFLOW:-unknown}"
echo "Project: ${CI_XCODE_PROJECT:-unknown}"
echo "Scheme: ${CI_XCODE_SCHEME:-AethonBeacon}"
echo "DerivedData: ${CI_DERIVED_DATA_PATH}"

rm -rf /tmp/AethonBeacon-XcodeCloudWarmup.xcarchive
xcodebuild \
  -derivedDataPath "${CI_DERIVED_DATA_PATH}" \
  -workspace AethonBeacon.xcworkspace \
  -scheme "${CI_XCODE_SCHEME:-AethonBeacon}" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath /tmp/AethonBeacon-XcodeCloudWarmup.xcarchive \
  CODE_SIGNING_ALLOWED=NO \
  archive

echo "== Xcode Cloud workspace warmup complete =="
