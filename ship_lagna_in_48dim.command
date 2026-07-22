#!/bin/bash
set -e
cd ~/AethonBeacon
rm -f .git/index.lock .git/HEAD.lock
git add -A -- App.tsx package.json pnpm-lock.yaml
if git diff --cached --quiet; then
  echo "Nothing new to commit (already committed) -- skipping straight to push."
else
  git commit -m "feat(astro): astronomy-engine + geocoded Ascendant, and weave Lagna into the 48-dimension predictions

Two changes landed together here:

1) Replaced the hand-rolled Sun/Moon longitude formulas with astronomy-engine
   (VSOP87 Sun theory, ELP2000-82B Moon theory) -- an established
   arc-second-precision astronomy library, instead of the ~15-term hand-rolled
   Meeus Moon series and 2-term Sun series that had roughly 0.5-1 degree of
   error, enough to misplace nakshatra/pada and Rashi boundaries. Added a real
   Ascendant (Lagna) calculation using OpenStreetMap Nominatim geocoding (free,
   no API key) plus the standard Local-Sidereal-Time + true-obliquity +
   latitude formula, falling back to the earlier Sun-anchored approximation
   whenever coordinates aren't available. Birth place text alone is enough --
   geocoding is automatic and debounced, no separate coordinate entry exists
   anywhere in the UI.

2) The 48-Dimension engine was Moon-chart only (Rashi, Nakshatra, Dasha,
   Tithi, Vara) -- a legitimate traditional technique (Chandra Kundali is the
   primary predictive chart in most Vedic systems) -- but it left the new
   precise Lagna calculation as display-only, unused by the actual
   predictions. buildMoonChart48DimensionEngine now accepts an optional
   lagnaId and blends it in as a secondary confirming layer on top of the
   Moon chart (which stays primary): the Lagna lord's classical category
   strengths (half-weighted vs. the Dasha lords), the Ascendant sign's
   element bias, and extra weight on the self/body categories specifically,
   since Lagna classically governs the physical self, vitality, and
   personality. Threaded lagnaId through all 3 call sites: the main-component
   memo that feeds the two-way astro counselling chat, VedicDailyCard, and
   BirthChartSection.

MoonChart48Reading's shape is unchanged, so the two-way conversation engine
and remedies needed no changes. Regenerated pnpm-lock.yaml so Android CI's
--frozen-lockfile step doesn't break on the new dependency. tsc --noEmit and
both regression suites (vedic + tone) pass clean."
fi
git push origin master
echo ""
echo "=== DONE: pushed astronomy-engine + geocoded Ascendant + Lagna-in-48-dim ==="
read -n1 -r -p "Press any key to close..."
