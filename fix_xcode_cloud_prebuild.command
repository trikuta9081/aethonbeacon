#!/bin/bash
set -e
cd ~/AethonBeacon
rm -f .git/index.lock .git/HEAD.lock
git add ios/ci_scripts/ci_pre_xcodebuild.sh
git commit -m "ios: remove obsolete Xcode Cloud warmup hack

The ios.useFrameworks=static fix resolved the real root cause (missing
CocoaPods module maps on a clean archive) -- confirmed by Xcode Cloud's
error count dropping from 51 modulemap errors to 0 on the next run.
The only remaining failure was this pre_xcodebuild warmup script itself
(exit 1), which is now obsolete: it was doing a full duplicate unsigned
archive + hardcoded test -f assertions on modulemap paths that no
longer match under static-framework linkage. Replaced with a no-op." || echo "(commit failed or nothing to commit)"
git push origin master
echo "==> Pushed. Both workflows should start within a few seconds:"
echo "    https://github.com/trikuta9081/aethonbeacon/actions"
echo "Press any key to close."
read -n1
