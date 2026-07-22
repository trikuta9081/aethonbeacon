#!/bin/bash
set -e
cd ~/AethonBeacon
echo "==> Pushing iOS build 42 bump to GitHub..."
rm -f .git/HEAD.lock .git/index.lock
git push origin master
echo "==> Done."
echo "Press any key to close."
read -n1
