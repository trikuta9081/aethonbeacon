#!/bin/bash
set -e
cd ~/AethonBeacon
rm -f .git/HEAD.lock .git/index.lock
git add .github/workflows/build-ios.yml
git commit -m "ci(ios): normalize .p8 secret to valid PEM before use (fix invalidPEMDocument)" || echo "Nothing to commit"
git push origin master
echo ""
echo "Fresh iOS run triggered. Watch: https://github.com/trikuta9081/aethonbeacon/actions"
