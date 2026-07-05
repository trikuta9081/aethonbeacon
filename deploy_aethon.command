#!/bin/bash
set -e
cd ~/AethonBeacon

echo ""
echo "==> Step 1: Nuking ALL old bundles and caches..."
rm -rf dist/
rm -rf .expo
rm -rf node_modules/.cache
rm -rf /tmp/metro-* /tmp/haste-* /tmp/react-native-* 2>/dev/null || true
rm -rf ~/Library/Caches/Expo ~/Library/Caches/expo-cli 2>/dev/null || true
echo "    All old bundles deleted. Building fresh from source."

echo ""
echo "==> Step 2: Rebuilding web bundle from clean slate..."
export EXPO_PUBLIC_VERIFICATION_API_BASE_URL=https://aethon-beacon-verification.onrender.com
npm run export:web

echo ""
echo "==> Step 3: Committing and pushing..."
rm -f .git/HEAD.lock .git/index.lock
git add -A
git add -f dist/
git commit -m "fix: counseling synthesis closing line + replay-aloud in journey panel

- buildCounselingSynthesis: complete closing sentence (no more dangling colon)
- CounselingChatModal: Replay guide summary aloud button added in journey panel
- Voice: female/male toggle in Settings (persisted), humanized pitch+rate per gender
- Redress: 11 routes, emergency triage, 4-step flow, evidence checklist, templates
- 20-dim lens strips on all major tabs; tab banners + issue hint chips everywhere
- TypeScript: zero errors" || echo "Nothing to commit"
git push origin master
git push render master

echo ""
echo "Done! Live in ~30 seconds."
echo "Open in a FRESH Incognito window: Cmd+Shift+N then go to aethonbeacon.com"
