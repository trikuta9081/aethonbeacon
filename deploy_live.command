#!/bin/bash
# deploy_live.command — the ONE command to ship an update everywhere.
#
# Running this file (double-click it, or `./deploy_live.command` in a
# terminal) is the entire release process. It replaces the half-dozen
# overlapping deploy_*.command scripts this project had accumulated
# (deploy_aethon.command, deploy-all.command, deploy_reset_build.command,
# deploy-audit.command, deploy_web_live_latest.command) — those pushed to
# different branches with different force settings, which is exactly how an
# update could land on one surface and silently miss another. This script
# is the single source of truth going forward; the old ones are gone.
#
# What "everywhere" means, concretely:
#   1. Web        — nayiq.co. Render's "aethon-beacon-web" service
#                    watches the "main" branch on the "render" remote
#                    (github.com/trikuta9081/AETHON-beacon-, a DIFFERENT
#                    GitHub repo from "origin"). It redeploys automatically
#                    within ~30s of that branch updating.
#   2. Android     — Play testers. GitHub Actions (build-android.yml) on the
#                    "origin" repo (github.com/trikuta9081/aethonbeacon)
#                    triggers on every push to its "master" branch.
#   3. iOS         — TestFlight. GitHub Actions (build-ios.yml), same repo,
#                    same trigger.
#
# So one clean release = typecheck, rebuild the web bundle, commit, then
# push to BOTH remotes in the right branches. Skipping either push is what
# causes "I shipped it but testers didn't get it" — this script never skips
# either one.
#
# Note on the two GitHub repos: they hold the same source and both are
# genuinely wired to live infrastructure (mobile CI vs. web hosting) — this
# is not an accident to "fix" by deleting one. The third, unrelated repo
# (github.com/trikuta9081/aethon-beacon, no trailing dash) is NOT touched by
# this script and is not referenced anywhere in this project; it is safe to
# delete on GitHub whenever you want to tidy up.
#
# Belt and suspenders: .github/workflows/mirror-to-render.yml now ALSO
# rebuilds the web bundle and pushes it to the render mirror automatically,
# server-side, on every push to origin/master (once its one-time
# RENDER_MIRROR_TOKEN secret is set — see that file). So even a plain
# `git push origin master` alone, without running this script, ships the
# web app too. This script still does its own local build+push regardless,
# so it keeps working exactly the same whether or not that secret has been
# set up yet, and never depends on GitHub Actions minutes to ship.

set -e
cd "$(dirname "$0")"

echo ""
echo "==> 1/5 Typecheck (catch errors before anything ships)"
npm run typecheck

echo ""
echo "==> 2/5 Clean caches and rebuild the web bundle"
rm -rf dist/ .expo node_modules/.cache
rm -rf /tmp/metro-* /tmp/haste-* /tmp/react-native-* 2>/dev/null || true
rm -rf ~/Library/Caches/Expo ~/Library/Caches/expo-cli 2>/dev/null || true
export EXPO_PUBLIC_VERIFICATION_API_BASE_URL=https://aethon-beacon-verification.onrender.com
npm run export:web

echo ""
echo "==> 3/5 Commit source + rebuilt bundle"
rm -f .git/HEAD.lock .git/index.lock
git add -A
git add -f dist/
if git diff --cached --quiet; then
  echo "    Nothing new to commit — already up to date."
else
  git commit -m "deploy: $(date '+%Y-%m-%d %H:%M') — ship latest to web + Android + iOS testers"
fi

echo ""
echo "==> 4/5 Push origin/master  ->  triggers Android + iOS tester builds"
git push origin master

echo ""
echo "==> 5/5 Push render/main    ->  triggers the live web app redeploy"
git push render master:main --force

echo ""
echo "Done. HEAD $(git rev-parse --short HEAD) is shipping to all three surfaces:"
echo "  Web     -> https://nayiq.co (live in ~30s — check in a fresh Incognito window)"
echo "  Android -> Play testers (Actions building now)"
echo "  iOS     -> TestFlight (Actions building now)"
echo "  Progress: https://github.com/trikuta9081/aethonbeacon/actions"
read -n1 -r -p "Press any key to close..."
