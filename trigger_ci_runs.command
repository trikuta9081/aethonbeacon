#!/bin/bash
set -e
cd ~/AethonBeacon
rm -f .git/index.lock .git/HEAD.lock
git commit --allow-empty -m "chore: trigger CI — all 5 signing secrets now configured

Retriggers build-android.yml and build-ios.yml now that
APPSTORE_API_KEY_P8 has been corrected and the 4 ANDROID_KEYSTORE_*
secrets have been added. No code changes." || echo "(commit failed)"
git push origin master
echo "==> Pushed. Both workflows should start within a few seconds:"
echo "    https://github.com/trikuta9081/aethonbeacon/actions"
echo "Press any key to close."
read -n1
