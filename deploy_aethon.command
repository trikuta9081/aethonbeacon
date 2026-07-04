#!/bin/bash
set -e
cd ~/AethonBeacon

echo ""
echo "==> Step 1: Rebuilding web bundle..."
export EXPO_PUBLIC_VERIFICATION_API_BASE_URL=https://aethon-beacon-verification.onrender.com
npm run export:web

echo ""
echo "==> Step 2: Committing dist + all changes..."
rm -f .git/HEAD.lock .git/index.lock
git add -A
git add -f dist/
git commit -m "deploy: rebuild web bundle with latest changes" || echo "Nothing to commit"
git push origin master
git push render master

echo ""
echo "Done! Render redeploying — live in ~30 seconds."
echo "Hard refresh: hold Shift and click Reload on aethonbeacon.com"
