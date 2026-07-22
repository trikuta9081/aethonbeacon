#!/bin/zsh
set -euxo pipefail

# This used to run a full unsigned "warmup" archive here to work around
# missing CocoaPods module maps on a clean Xcode Cloud archive. The real
# fix was setting ios.useFrameworks=static in Podfile.properties.json
# (see ios/Podfile.properties.json), which makes CocoaPods generate a
# proper modulemap for every pod instead of relying on this warmup hack.
# With that fixed, the managed archive builds the workspace correctly on
# its own, so this script is now a no-op.
echo "== AethonBeacon Xcode Cloud pre-xcodebuild: no-op (modulemap fix applied via Podfile.properties.json) =="
