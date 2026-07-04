#!/bin/bash
# Aethon Beacon — one-click deploy
set -e
cd ~/AethonBeacon

# Remove stale git lock files
rm -f .git/HEAD.lock .git/index.lock

# Commit all changes
git add -A
git commit -m "fix: remove Daily Loop, Beacon Guide, Journal, Follow-up; fix 35+ contrast issues; counsel-first routing"

# Push to GitHub (triggers Render web redeploy)
git push origin master
git push render master

echo ""
echo "Done! Web app will redeploy at aethonbeacon.com in ~2 minutes."
