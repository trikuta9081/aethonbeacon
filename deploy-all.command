#!/bin/bash
set -e
cd ~/AethonBeacon

echo "==> Rebuilding web bundle..."
export EXPO_PUBLIC_VERIFICATION_API_BASE_URL=https://aethon-beacon-verification.onrender.com
npm run export:web

echo "==> Committing and pushing..."
rm -f .git/HEAD.lock .git/index.lock
git add -A
git commit -m "deploy: update web bundle + push latest changes" 2>/dev/null || echo "Nothing new to commit"
git push origin master
git push render master

echo ""
echo "Done! Render will redeploy in ~30 seconds (no build step needed)."
echo "Check: https://aethonbeacon.com"
