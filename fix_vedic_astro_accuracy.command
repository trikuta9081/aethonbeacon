#!/bin/bash
set -e
cd ~/AethonBeacon
rm -f .git/index.lock .git/HEAD.lock
git add App.tsx
git commit -m "fix(astro): use actual birth time (not noon-UTC) for Rashi/Nakshatra/Dasha, and anchor Lagna off Sun instead of Moon

- getJanmaNakshatra/getMoonRashiFromDOB/getVimshottariDashaState previously
  called parseVedicDateAtNoonUtc(dob), silently ignoring the birth time the
  user actually enters. Moon moves ~0.55 deg/hour, so this could shift the
  result several degrees -- enough to flip nakshatra/pada near a boundary
  and cascade into wrong Antardasha timing for everyone.
- Added parseVedicBirthMoment(dob, birthTime) which combines date+time
  (assumed IST) into the correct UTC instant, and threaded birthTime through
  every call site.
- getLagnaFromBirthDetails anchored Lagna off the MOON's Rashi, which has no
  astronomical relationship to the Ascendant. Rewrote it to anchor off the
  SUN's sidereal longitude at the birth moment instead, which is the
  standard simplified approximation (Ascendant ~= Sun's position at local
  sunrise, advancing ~1 sign/2hr after)."
git push origin master
echo ""
echo "=== DONE: pushed Vedic astro accuracy fix ==="
read -n1 -r -p "Press any key to close..."
