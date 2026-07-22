#!/bin/bash
set -e
cd ~/AethonBeacon
rm -f .git/index.lock .git/HEAD.lock
git add ios/AethonBeacon.xcodeproj/project.pbxproj app.json
git commit -m "ios: bump build number to 43

Build 42 is already live on TestFlight, so any successful CI archive
under the same build number would be rejected by App Store Connect
as a duplicate. Bumping to 43 so the next successful Archive can
actually upload." || echo "(commit failed or nothing to commit)"
git push origin master
echo "==> Pushed. Both workflows should start within a few seconds:"
echo "    https://github.com/trikuta9081/aethonbeacon/actions"
echo "Press any key to close."
read -n1
