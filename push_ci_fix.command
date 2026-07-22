#!/bin/bash
set -e
cd ~/AethonBeacon
echo "==> Cleaning up any stale git locks..."
rm -f .git/index.lock .git/HEAD.lock
echo "==> Removing stray __pycache__ (not needed in repo)..."
rm -rf .github/scripts/__pycache__
echo "==> Staging changes..."
git add -A
echo "==> Committing..."
git commit -m "Fix iOS CI: extract ASC key normalization to standalone script

- Move the App Store Connect .p8 key normalization logic out of an
  embedded heredoc-in-YAML block into .github/scripts/normalize_asc_key.py
  to eliminate YAML block-scalar / heredoc indentation ambiguity that
  was causing every CI run to fail at the key-write step.
- Fix ios/exportOptions.plist bundle id typo (com.aethon.beacon -> com.aethonbeacon.app).
- Misc local script/config touch-ups from manual build 42 archive." || echo "(nothing to commit)"
echo "==> Pushing to GitHub..."
git push origin master
echo "==> Done."
echo "Press any key to close."
read -n1
