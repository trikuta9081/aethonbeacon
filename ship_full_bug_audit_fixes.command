#!/bin/bash
set -e
cd ~/AethonBeacon
rm -f .git/index.lock .git/HEAD.lock
git add -A -- App.tsx
if git diff --cached --quiet; then
  echo "Nothing new to commit (already committed) -- skipping straight to push."
else
  git commit -m "fix: full line-by-line bug audit -- ~20 concrete fixes across engines, data, and UI

A 6-way read-through of the entire 38k-line App.tsx surfaced these confirmed
bugs (not style nits). Fixed all of them:

Data / logic:
- ISO pulse tones 1/2/3 Hz all silently played at 8 Hz -- ISO_PARAMS map was
  missing entries for them, so they fell back to the iso-8 frequency.
- recommendedRoute ternary had a dead branch: both outcomes of the
  supportHigh check returned the same string ('Guidance'); the true 'no
  strong signal' case now returns a distinct 'Explore'.
- Identity profiles 'parent' and 'retired' shared the same one-letter badge
  mark ('R'); retired is now 'I'.
- isIssueId() type guard only recognized 8 of the 17 IssueId values, so a
  user's active issue (grief, identity, health, financial, relationship,
  parenting, trauma, academic, or addiction) was silently reset to default
  on every app restart. Now checks the full union.
- getAIHelpOpenTabLabel said 'Guidance' for a route that actually opens the
  tab labeled 'Path' everywhere else -- corrected the mislabeled copy.
- Community chat vs. feed 'Report' used inconsistent/inverted default report
  reasons based on author role; both now default to 'other' consistently.
- generateDailyVisitReport had a dead 'today' filter (computed todayStr,
  never used it, unconditionally returned true) -- removed the dead code
  and documented the actual pre-filter-by-caller contract.
- Duplicate 'vedic' journey step could be pushed twice (two separate
  conditions both push tabId: 'vedic', only one had a dedupe guard),
  producing a duplicate React key and two contradictory cards. Added the
  guard to the second condition too.
- Counseling copy advertised 'asks up to 7 questions' but the synthesis
  trigger only ever asks 6 -- corrected the copy to match actual behavior.

Correctness / data integrity:
- Birth date parsing (parseVedicBirthMoment, parseVedicDateAtNoonUtc) only
  validated day as 1-31, not against the actual days-in-month for the given
  month/leap-year -- Date.UTC was silently rolling invalid dates (e.g. Feb
  30) into the next month, shifting every downstream Rashi/Nakshatra/Dasha/
  Lagna calculation with no indication to the user. Added a real calendar
  validator (isValidCalendarDate) and wired it into both parsers and into
  BirthChartSection's own save-gate (which previously only checked digit
  format, not that day/month/hour/minute were in valid ranges).
- The AsyncStorage save effect's dependency array was missing profileDOB,
  profileBirthTime, profileBirthPlace, profileBirthLat, profileBirthLon, and
  themePreference -- editing birth details or switching the theme did not
  reliably trigger a save, so those changes could be silently lost on next
  launch. Added all six to the dependency list.
- Verification-to-'verified'-role upgrade required BOTH phone AND email to
  be verified (AND), while every other check in the file (and the
  'unlocked' success message shown immediately after) treats a single
  verified channel as sufficient (OR). Fixed both the remote and local
  fallback verification paths to use OR, matching the rest of the app.

Safety / reliability:
- Emergency SOS call buttons (112/181 banner, state emergency/women
  helpline buttons) had no error handling and no accessibility label, unlike
  every other 'Call' button in the file -- added a shared dialEmergencyNumber
  helper (tries to open the dialer, falls back to an Alert with the number
  if the device can't) and accessibility labels, so tapping these on web or
  a non-telephony device no longer fails silently.
- CounselingChatModal's three speakText() calls were scheduled via raw
  setTimeout with no cleanup -- closing the modal or reopening it with a new
  issue within the delay window still played the queued voice line after
  dismissal. Added a tracked/cancellable timeout ref.
- Voice input had no in-flight guard -- a rapid double-tap during the
  permission-request await could start two overlapping speech recognition
  sessions. Added a starting-flag ref.

UI contrast / accessibility:
- StatusBar was hardcoded to dark regardless of the light/dark theme toggle
  added in the previous pass -- now follows activeColorScheme.
- Selected routine card flipped to a near-white background while its text
  stayed near-white (both meant for the dark background), making the
  selected routine unreadable -- fixed to a themed dark highlight instead.
- Community hero preview message had a hardcoded dark bg-color left over
  inside an otherwise light card, with dark navy text on top of it --
  fixed to a light background consistent with the card.
- verificationStatusChipLabelActive and focusStepIndex both had background
  and text colors that were two near-identical near-white values --
  functionally invisible text in their default/active states. Fixed both.
- Added accessibilityRole/accessibilityLabel to 5 unlabeled dismiss (X)
  buttons on the Home hero cards, the weekly Vedic banner's close button,
  and 6 controls in CounselingChatModal (Close, Skip, Start my journey, Not
  right now, voice input, send) that were missing role and/or label.

tsc --noEmit and both regression suites (vedic + tone) pass clean."
fi
git push origin master
echo ""
echo "=== DONE: pushed full bug-audit fix batch ==="
read -n1 -r -p "Press any key to close..."
