#!/bin/bash
cd ~/AethonBeacon
rm -f .git/HEAD.lock .git/index.lock
git add -A
git commit -m "ci: add GitHub Actions Android build workflow" 2>/dev/null || echo "Nothing to commit"
git push origin master
git push render master
echo ""
echo "Done! GitHub Actions will now auto-build the Android APK on every push."
echo "Check: https://github.com/trikuta9081/aethonbeacon/actions"
