#!/bin/bash
set -e
cd ~/AethonBeacon
rm -f .git/index.lock .git/HEAD.lock
git add -A -- App.tsx
if git diff --cached --quiet; then
  echo "Nothing new to commit (already committed) -- skipping straight to push."
else
  git commit -m "fix(ui): correct light/dark contrast on themed surfaces

Two real contrast bugs found while double-checking the dark-mode pass:

1. The 'More' overflow button in both tab-rail layouts (compact + wide)
   was left out of the theme wiring entirely -- its background and '+'
   / 'More' text stayed hardcoded to dark-theme values (COLORS.bgDeep,
   COLORS.textMuted) regardless of the active theme. Now themed like
   every other tab button.

2. The section-switcher's TabButton only themed its ACTIVE state
   (backgroundColor: theme.surfaceAlt). The inactive/base state kept a
   hardcoded dark background (#0D1F22) while its text already read from
   theme.textMuted -- which is a DARK color in light mode. Net effect:
   dark text on a dark background, unreadable, for every non-active tab
   in the 'Open a page' grid whenever light theme was selected. Now the
   base state also pulls backgroundColor/borderColor from theme.

Audited every other theme.* color pairing in the file (tab rail, splash,
section-switcher sheet + close button, Settings Appearance toggle) to
confirm background and text always come from the same theme object, so
no other background/text mismatches are being introduced.

tsc --noEmit and both regression suites (vedic + tone) pass clean."
fi
git push origin master
echo ""
echo "=== DONE: pushed theme contrast fix (More button + section-switcher tabs) ==="
read -n1 -r -p "Press any key to close..."
