#!/bin/zsh
set -euxo pipefail

echo "== AethonBeacon Xcode Cloud pre-xcodebuild workspace warmup =="
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"
export PATH="/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/opt/node@22/bin:/usr/local/opt/node@22/bin:/opt/homebrew/opt/node/bin:/usr/local/opt/node/bin:${PATH}"
export RUBYOPT="${RUBYOPT:-} -rlogger"

# Xcode Cloud workflow is currently archiving the .xcodeproj. Build the workspace first
# so CocoaPods module maps/products exist before the archive step starts.
cd ios
DERIVED_DATA_ARGS=()
if [[ -n "${CI_DERIVED_DATA_PATH:-}" ]]; then
  DERIVED_DATA_ARGS=(-derivedDataPath "${CI_DERIVED_DATA_PATH}")
fi
xcodebuild \
  ${DERIVED_DATA_ARGS[@]} \
  -workspace AethonBeacon.xcworkspace \
  -scheme AethonBeacon \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  CODE_SIGNING_ALLOWED=NO \
  build

echo "== Xcode Cloud workspace warmup complete =="
