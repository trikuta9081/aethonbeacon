#!/bin/bash
set -e
cd ~/AethonBeacon
rm -f .git/index.lock .git/HEAD.lock
git add -A -- App.tsx package.json pnpm-lock.yaml
if git diff --cached --quiet; then
  echo "Nothing new to commit (already committed) -- skipping straight to push."
else
  git commit -m "feat(ui): reinstate dark/light theme toggle + fix missed emoji tab list

Dark mode was built early on but didn't survive an earlier hard-reset to
baseline and was never in the list of amendments re-applied afterward.
This scopes it back in on the surfaces already migrated onto color
tokens from the last UI polish pass, rather than claiming a full-app
retheme (the other ~380 hardcoded-dark hex usages elsewhere in the file
are untouched and still render dark-only):

- Added a LIGHT_COLORS palette alongside the existing DARK_COLORS, and a
  ThemeColors mapped type ({ [K in keyof typeof DARK_COLORS]: string })
  so a single theme value can hold either literal-typed palette without
  a TS2322 mismatch.
- Added themePreference ('system' | 'light' | 'dark') to persisted app
  state (AsyncStorage load + save), defaulting to 'system'. Added
  useColorScheme-based activeColorScheme resolution.
- Wired theme into: splash screen (background, logo mark, Playfair
  title, subtitle, dot indicators), both top tab rail layouts (compact
  + wide), the section-switcher modal and its TabButton, and the Home
  hero greeting text.
- Fixed the second tab list (the section-switcher 'Open a page' modal's
  TabButton) which still used a raw emoji mark after the first UI
  polish pass -- now uses the same Ionicons glyph as the main tab bar,
  tinted to the active theme.
- Added a Settings > Appearance block with a System / Light / Dark
  segmented control writing to themePreference.
- Fixed the resulting TS2322 errors from DARK_COLORS/LIGHT_COLORS being
  two differently-valued 'as const' object literals by widening the
  theme prop types (TabButton, SettingsSection) from 'typeof
  DARK_COLORS' to the new 'ThemeColors' type.

tsc --noEmit and both regression suites (vedic + tone) pass clean."
fi
git push origin master
echo ""
echo "=== DONE: pushed dark mode reinstatement + tab-list icon fix ==="
read -n1 -r -p "Press any key to close..."
