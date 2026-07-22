#!/bin/bash
set -e
cd ~/AethonBeacon
rm -f .git/index.lock .git/HEAD.lock
git add ios/Podfile.properties.json
git commit -m "fix(ios): set ios.useFrameworks=static to fix missing Expo modulemaps

Podfile.properties.json never set ios.useFrameworks, so the Podfile's
conditional 'use_frameworks!' line never ran and every pod built as a
plain static library. That's the root cause of the 'module map file
not found' errors for every Expo Swift module (EXConstants,
ExpoModulesCore, ExpoAudio, ExpoFont, EXUpdates, etc.) seen on both
the GitHub Actions Archive iOS step and the Xcode Cloud managed
archive for this commit. Static-framework linkage makes CocoaPods
generate a real modulemap per pod.

Prior commits (Share iOS scheme for EAS builds, Warm Xcode Cloud
DerivedData path, Fix Xcode Cloud archive warmup, Serialize iOS
scheme pod build, etc.) worked around symptoms without touching this
setting." || echo "(commit failed or nothing to commit)"
git push origin master
echo "==> Pushed. Both workflows should start within a few seconds:"
echo "    https://github.com/trikuta9081/aethonbeacon/actions"
echo "Press any key to close."
read -n1
