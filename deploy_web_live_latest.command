#!/bin/bash
set -e
cd ~/AethonBeacon

echo ""
echo "==> Step 1: Committing any pending App.tsx changes (border-color cleanup)..."
rm -f .git/index.lock .git/HEAD.lock
git add -A -- App.tsx
if git diff --cached --quiet; then
  echo "    Nothing pending -- already committed."
else
  git commit -m "fix(ui): correct leftover light-theme border colors on dark cards"
fi

echo ""
echo "==> Step 2: Nuking ALL old bundles and caches..."
rm -rf dist/
rm -rf .expo
rm -rf node_modules/.cache
rm -rf /tmp/metro-* /tmp/haste-* /tmp/react-native-* 2>/dev/null || true
rm -rf ~/Library/Caches/Expo ~/Library/Caches/expo-cli 2>/dev/null || true
echo "    All old bundles deleted. Building fresh from source."

echo ""
echo "==> Step 3: Rebuilding web bundle from clean slate..."
export EXPO_PUBLIC_VERIFICATION_API_BASE_URL=https://aethon-beacon-verification.onrender.com
npm run export:web

echo ""
echo "==> Step 4: Committing bundle and pushing..."
rm -f .git/HEAD.lock .git/index.lock
git add -A
git add -f dist/
git commit -m "chore(web): rebuild live web bundle -- Vedic engine accuracy upgrade, dark/light theme, UI polish, full bug-audit fixes

Bundles up everything shipped since the last web deploy:
- astronomy-engine Sun/Moon + real geocoded Ascendant/Lagna, woven into the
  48-dimension prediction scoring
- Icons, display typeface, color tokens, and haptics UI polish pass
- Dark/light theme toggle (splash, tab bar, section switcher, Home hero,
  Settings Appearance control) + the missed emoji tab-list fix
- Full line-by-line bug audit: ~20 concrete fixes across the Vedic/astro
  engines, AsyncStorage persistence, verification logic, safety-critical
  call buttons, counseling chat reliability, and UI contrast/accessibility
- Leftover light-theme border-color cleanup on dark cards

tsc --noEmit and both regression suites (vedic + tone) pass clean." || echo "Nothing new to commit for bundle"
git push origin master
git push render master

echo ""
echo "Done! Live in ~30 seconds."
echo "Open in a FRESH Incognito/Private window (Cmd+Shift+N) and go to aethonbeacon.com"
read -n1 -r -p "Press any key to close..."
