#!/bin/bash
# Deploy reset baseline (1171567) + amendments 1-18 (with 20-dim strip restored).
# Sole reference for the app going forward.

set -e
cd ~/AethonBeacon

echo ""
echo "==> Step 1: Nuking ALL old bundles and caches..."
rm -rf dist/
rm -rf .expo
rm -rf node_modules/.cache
rm -rf /tmp/metro-* /tmp/haste-* /tmp/react-native-* 2>/dev/null || true
rm -rf ~/Library/Caches/Expo ~/Library/Caches/expo-cli 2>/dev/null || true

echo ""
echo "==> Step 2: Rebuild web bundle..."
export EXPO_PUBLIC_VERIFICATION_API_BASE_URL=https://aethon-beacon-verification.onrender.com
npm run export:web

echo ""
echo "==> Step 3: Commit + push..."
rm -f .git/HEAD.lock .git/index.lock
git add -A
git add -f dist/
git commit -m "reset 1171567 + A1..A18 (profile-first, Moon-primary, astro chat, UI polish, complaint upgrade, trending tones, profile intro, community rules, chart auto-sync, meditation issue-matched, aggravated-abuse detector, BNS/BNSS + ragging/staff + FIR options, state officer directory, free legal aid, all-India govt cells, national health directory, each tab own page, compact home hero with 20-dim redressal strip retained)" || echo "Nothing to commit"
git push origin master --force
git push render master:main --force

echo ""
echo "==> Step 4: Report"
echo "    HEAD: $(git rev-parse --short HEAD)"
echo "    App.tsx: $(wc -l < App.tsx | tr -d ' ') lines"
echo ""
echo "Done! Live in ~30 seconds. Fresh Incognito → aethonbeacon.com"
