#!/bin/bash
set -e
cd ~/AethonBeacon
rm -f .git/index.lock .git/HEAD.lock
git add .github/workflows/build-ios.yml ios/ci_scripts/ci_pre_xcodebuild.sh
git commit -m "ci(ios): add unsigned warmup build before archive to fix clean-checkout 'No such module Expo' race, plus archive log artifact"
git push origin master
echo ""
echo "=== DONE: pushed iOS CI warmup-build fix ==="
read -n1 -r -p "Press any key to close..."
