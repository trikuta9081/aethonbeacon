#!/bin/bash
set -e
cd ~/AethonBeacon
rm -f .git/index.lock .git/HEAD.lock
git add -A -- App.tsx package.json pnpm-lock.yaml
if git diff --cached --quiet; then
  echo "Nothing new to commit (already committed) -- skipping straight to push."
else
  git commit -m "feat(ui): first UI polish pass -- real icons, display typeface, color tokens, haptics

Scoped implementation of the top items from a UI audit (raw emoji icons
everywhere, no fontFamily set anywhere, 390 raw hex colors with no shared
tokens, expo-haptics installed but unused). Full sweeps of all four are
future work -- this pass proves the pattern on the highest-visibility
surfaces without risking a 38k-line file:

- Added @expo/vector-icons (already an Expo-maintained package, no extra
  native linking). Replaced the tab bar's 15 emoji marks with Ionicons
  (home/compass/sparkles/chatbubbles/book/leaf/musical-notes/flower/
  planet/shield-checkmark/stats-chart/search/footsteps/language/settings),
  tinted to the existing active/inactive tab colors so nothing else about
  the tab bar changed.

- Added expo-font + @expo-google-fonts/playfair-display, loaded via
  useFonts (standard Expo pattern, not a native config plugin -- no
  app.json changes needed). Applied to the two highest-visibility text
  moments: the Home hero greeting name (shown every time Home opens) and
  reserved for the splash brand mark. Falls back to the existing system
  font + weight until fonts finish loading, so there's no broken/missing
  text if font loading is ever slow.

- Added a COLORS token object with the app's most-used hex values (dark
  surfaces, accent teal/cyan/gold, status colors) and migrated the tab
  bar's styles onto it as the first surface -- establishes the pattern for
  a later full migration off the ~390 scattered inline hex colors.

- Wired the already-installed-but-unused expo-haptics into 5 real
  interaction points: tab switches (selection), daily check-in save
  (success notification), birth-chart save (success notification), and
  both chat send actions -- astro chat and the two-way counselling chat
  (light impact).

tsc --noEmit and both regression suites (vedic + tone) pass clean.
Regenerated pnpm-lock.yaml for the 3 new dependencies so Android CI's
--frozen-lockfile step doesn't break."
fi
git push origin master
echo ""
echo "=== DONE: pushed UI polish pass (icons + typeface + color tokens + haptics) ==="
read -n1 -r -p "Press any key to close..."
