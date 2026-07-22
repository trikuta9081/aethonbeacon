#!/bin/bash
set -e
cd ~/AethonBeacon
rm -f .git/index.lock .git/HEAD.lock
git add -A -- ios/AethonBeacon.xcodeproj/project.pbxproj app.json
if git diff --cached --quiet; then
  echo "Nothing new to commit (already committed) -- skipping straight to push."
else
  git commit -m "fix(ios): bump build number 43 -> 44 to unblock CI TestFlight uploads

Every 'Build iOS -> TestFlight' GitHub Actions run since build 43 was
manually uploaded via Xcode/Transporter has failed (commits e129473,
fb945ca, b60133f, a244d89, edc423c, 4afc44b, 07195d1 all red-X), while the
Android APK workflow has succeeded on every one of those same commits.

CURRENT_PROJECT_VERSION (project.pbxproj) and ios.buildNumber (app.json)
were both still frozen at 43 -- App Store Connect rejects a TestFlight
upload whose CFBundleVersion exactly matches a build it has already
received, which explains the failure pattern (Android succeeds because
that workflow only builds an APK artifact, it doesn't publish anywhere,
so there's no duplicate-version collision possible there).

Bumped both to 44 so the next CI run uploads a build number Apple hasn't
seen yet. MARKETING_VERSION stays 1.0.4 -- only the build number needed
to move."
fi
git push origin master
echo ""
echo "=== DONE: pushed iOS build 44 -- watch the 'Build iOS -> TestFlight' Action to confirm it goes green ==="
read -n1 -r -p "Press any key to close..."
