#!/bin/bash
# Hard-reset ~/AethonBeacon to the July 6 TestFlight baseline (commit 1171567).
# Preserves a safety branch pre-reset-backup-2026-07-10 pointing at the current tip
# so nothing is truly lost.

set -e
cd ~/AethonBeacon

echo ""
echo "==> Step 1: Safety net — tag current tip as safety branch"
CUR=$(git rev-parse HEAD)
echo "    current HEAD = $CUR"
git branch -f pre-reset-backup-2026-07-10 "$CUR"
echo "    branch pre-reset-backup-2026-07-10 -> $CUR"

echo ""
echo "==> Step 2: Clear any locks + hard-reset to baseline 1171567"
rm -f .git/HEAD.lock .git/index.lock
git reset --hard 1171567

echo ""
echo "==> Step 3: Nuke stale worktree files not in baseline"
rm -rf dist/ dist_v2 dist_v3 dist_v5 dist_final dist_new .expo node_modules/.cache
rm -rf /tmp/metro-* /tmp/haste-* /tmp/react-native-* 2>/dev/null || true
rm -rf ~/Library/Caches/Expo ~/Library/Caches/expo-cli 2>/dev/null || true

echo ""
echo "==> Step 4: Push safety branch, then force-push master + render main"
git push origin pre-reset-backup-2026-07-10 --force
git push origin master --force
git push render master:main --force

echo ""
echo "==> Step 5: Report"
echo "    HEAD is now: $(git rev-parse --short HEAD)"
echo "    Files:       $(git ls-files | wc -l | tr -d ' ')"
echo ""
echo "Done. Baseline is now 1171567 (Jul 6 TestFlight snapshot)."
echo "Safety branch: pre-reset-backup-2026-07-10 (recover with: git checkout that branch)"
