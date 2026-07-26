#!/bin/bash
set -e
cd ~/AethonBeacon

echo ""
echo "==> Checking remotes..."
git remote -v

echo ""
echo "==> The 'render' remote (trikuta9081/AETHON-beacon-.git) has diverged from"
echo "    origin (trikuta9081/aethonbeacon.git, the real source of truth)."
echo "    This mirror only exists so Render.com can watch it and auto-deploy --"
echo "    it should always just mirror origin's master, so we force-push to it."
echo ""
read -p "Force-push current master to the 'render' mirror? [y/N] " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Aborted -- nothing pushed."
  read -n1 -r -p "Press any key to close..."
  exit 0
fi

git push render master --force

echo ""
echo "=== DONE: 'render' mirror now matches origin/master. Check Render's dashboard for the new deploy. ==="
read -n1 -r -p "Press any key to close..."
