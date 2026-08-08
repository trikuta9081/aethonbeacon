#!/bin/bash
set -e
cd ~/AethonBeacon
rm -f .git/index.lock .git/HEAD.lock
git add -A -- App.tsx
if git diff --cached --quiet; then
  echo "Nothing new to commit (already committed) -- skipping straight to push."
else
  git commit -m "fix(ui): correct leftover light-theme border colors on dark cards

Follow-up cleanup from the full bug audit's style-sheet pass. 22 style
blocks had a dark backgroundColor (#0D1F22 / #091A1D, the standard dark
card fill) paired with a borderColor left over from an earlier light-theme
pass (#D9CDBD, #CFC4B8, #D6E0F4, #E5ECF7, #DDD3C2, #C7D8F4, #D8E3DB) --
producing a washed-out pastel outline around otherwise dark cards across
the footer, issue/play steps, guided help input/bubble, hero artifacts, guided
steps, onboarding/profile sheets and their close buttons, launch need
cards, admin quick actions, calm situation/voice bands, private-intake flow
cards, access-flow pills, and the settings input.

Checked every candidate individually before touching it -- 3 of the ~25
raw hits (footerMiniButtonSecondary, voiceAssistButtonSecondary,
ratingChip) already pair a light border with a light background and were
correctly left alone; only the confirmed dark-bg/light-border mismatches
were changed, all to the same rgba(14,111,105,0.3) teal-tinted border
already used as the dark-card border convention elsewhere in the file
(e.g. routineButton, communityChatBubble).

Purely cosmetic -- no logic, data, or behavior changes. tsc --noEmit and
both regression suites (vedic + tone) pass clean."
fi
git push origin master
echo ""
echo "=== DONE: pushed border-color cleanup ==="
read -n1 -r -p "Press any key to close..."
