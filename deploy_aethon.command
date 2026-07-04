#!/bin/bash
set -e
cd ~/AethonBeacon

echo ""
echo "==> Step 1: Clearing caches..."
rm -rf .expo node_modules/.cache /tmp/metro-* /tmp/haste-* 2>/dev/null || true

echo ""
echo "==> Step 2: Rebuilding web bundle..."
export EXPO_PUBLIC_VERIFICATION_API_BASE_URL=https://aethon-beacon-verification.onrender.com
npm run export:web

echo ""
echo "==> Step 3: Committing and pushing..."
rm -f .git/HEAD.lock .git/index.lock
git add -A
git add -f dist/
git commit -m "deploy: fresh rebuild with latest changes" || echo "Nothing to commit"
git push origin master
git push render master

echo ""
echo "Done! Live in ~30 seconds."
echo "Open in Incognito: Cmd+Shift+N then go to aethonbeacon.com"
