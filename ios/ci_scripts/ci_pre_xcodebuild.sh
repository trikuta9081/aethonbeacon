#!/bin/zsh
set -uxo pipefail

# Background: this script used to run a full unsigned "warmup" archive with
# hardcoded `test -f` assertions on specific modulemap paths, working around
# missing CocoaPods module maps on a clean Xcode Cloud archive. The real fix
# for THAT was setting ios.useFrameworks=static in Podfile.properties.json
# (see ios/Podfile.properties.json) — confirmed it made CocoaPods generate a
# proper modulemap for every pod. That dropped the error count from 51 to 1.
#
# The one remaining error is a different, narrower issue: on a fully clean
# checkout (no DerivedData at all), Xcode has been observed to start
# compiling AppDelegate.swift ("No such module 'Expo'") before the "Expo"
# pod's own Swift module has finished building. A single unsigned `build`
# pass here forces every pod target to build once in dependency order and
# populates the module cache, so the managed archive that follows reuses it
# instead of racing. No brittle path assertions this time — if the warmup
# itself fails for an unrelated reason, we don't want that to mask the real
# archive's own error, so we just log and move on either way.
echo "== AethonBeacon Xcode Cloud pre-xcodebuild: warmup build =="
cd "$CI_PRIMARY_REPOSITORY_PATH/ios" || cd "$(dirname "$0")/.."

xcodebuild \
  -workspace AethonBeacon.xcworkspace \
  -scheme AethonBeacon \
  -configuration Release \
  -destination "generic/platform=iOS" \
  CODE_SIGN_STYLE=Automatic \
  CODE_SIGNING_ALLOWED=NO \
  build
WARMUP_STATUS=$?
echo "== Warmup build exit status: $WARMUP_STATUS =="
exit 0
