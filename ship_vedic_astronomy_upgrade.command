#!/bin/bash
set -e
cd ~/AethonBeacon
rm -f .git/index.lock .git/HEAD.lock
git add App.tsx package.json pnpm-lock.yaml
git commit -m "feat(astro): replace hand-rolled Sun/Moon formulas with astronomy-engine + real geocoded Ascendant

- Added astronomy-engine (VSOP87 Sun theory, ELP2000-82B Moon theory),
  an established arc-second-precision astronomy library, replacing the
  ~15-term hand-rolled Meeus Moon series and 2-term Sun series that had
  roughly 0.5-1 degree of error -- enough to misplace nakshatra/pada and
  Rashi boundaries.
  - getApproxTropicalMoonLongitude -> Astronomy.EclipticGeoMoon(date).lon
  - getApproxTropicalSunLongitude -> Astronomy.SunPosition(date).elon
  - Added getTrueObliquityDegrees via Astronomy.e_tilt
  - Added getGreenwichSiderealTimeDegrees via Astronomy.SiderealTime

- Added a REAL Ascendant (Lagna) calculation. Previously Lagna was only
  ever approximated from the Sun's position (better than the old
  Moon-anchor bug, but still not a true Ascendant, which requires the
  birth latitude/longitude and local sidereal time).
  - geocodeBirthPlace(place) resolves the user's typed birth place to
    lat/lon via OpenStreetMap Nominatim (free, no API key).
  - getPreciseAscendantSiderealDegrees(date, lat, lon) implements the
    standard spherical-astronomy Ascendant formula (Local Sidereal Time
    + true obliquity + latitude), then converts tropical -> sidereal
    with the existing Lahiri ayanamsa.
  - getLagnaFromBirthDetails now uses the precise formula whenever
    coordinates are available, and falls back to the Sun-anchored
    approximation otherwise (offline, or geocoding not yet resolved) --
    it never regresses below the previous accuracy level.

- Added profileBirthLat/profileBirthLon/birthPlaceGeocodeStatus state,
  persisted via AsyncStorage, with a debounced (800ms) geocoding effect
  keyed on the birth-place text so re-typing doesn't spam the API.

- BirthChartSection now reports whether Lagna used the precise
  geocoded calculation or the fallback approximation.

- Regenerated pnpm-lock.yaml so Android CI's --frozen-lockfile step
  doesn't break on the new dependency; tsc --noEmit and the vedic
  regression suite both pass clean."
git push origin master
echo ""
echo "=== DONE: pushed astronomy-engine + geocoded Ascendant upgrade ==="
read -n1 -r -p "Press any key to close..."
