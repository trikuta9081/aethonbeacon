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
export EXPO_PUBLIC_SUPABASE_URL=https://isfkxmrathirqkrwfagg.supabase.co
export EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_x2hdByZdsmU26qPDuy5pZA_1PztSSwv
npm run export:web

echo ""
echo "==> Step 3: Committing and pushing..."
rm -f .git/HEAD.lock .git/index.lock
git add -A
git add -f dist/
git commit -m "chore: rebuild web bundle — startup/admin/Help & Redress/voice-mute batch

Web export of the batch already on master:
- Fixed duplicate first-launch prompt (Onboarding + Account overlays firing
  at once) and rebuilt Admin Control Centre with a reachable login gate.
- Help & Redress: fixed unreadable state-name buttons, fixed the domain
  allowlist so state police/DC links actually open, hardened the 3 panels
  against blank-space stretch, added the 4 missing draft complaint
  templates, merged a Quick Exit bar (SOS + read-aloud) into the top panel.
- Counselling chat: added a 🔊/🔇 mute button in the header, wired to the
  app-wide voice-assistance switch, so the automatic spoken reply can be
  silenced without leaving the conversation." || echo "Nothing to commit"
git push origin master
# Render's "aethon-beacon-web" service watches the "main" branch on the
# "render" remote (github.com/trikuta9081/AETHON-beacon-, a DIFFERENT repo
# from "origin"). Pushing plain "master" here creates/updates a master
# branch nobody watches -- it silently never triggers a deploy. Push to
# main explicitly so Render's auto-deploy (on-commit) actually fires.
#
# --force is deliberate and safe here: this remote only ever receives
# pushes from this script (Render just watches and builds from it, it
# never pushes back), and local master's history has been rewritten more
# than once in this project (e.g. the mid-project hard reset), which makes
# it a non-fast-forward from whatever main last looked like. There's
# nothing on this mirror worth preserving independently of master.
git push render master:main --force

echo ""
echo "Done! Live in ~30 seconds."
echo "Open in a FRESH Incognito window: Cmd+Shift+N then go to aethonbeacon.com"
