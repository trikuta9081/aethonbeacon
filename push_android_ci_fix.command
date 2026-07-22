#!/bin/bash
set -e
cd ~/AethonBeacon
rm -f .git/index.lock .git/HEAD.lock
git add -A
git commit -m "Fix Android CI: materialize release keystore from secrets

android/app/build.gradle throws a hard GradleException for the release
build type unless android/keystore.properties exists. That file is
correctly gitignored (it holds real signing passwords) so it never
reached CI — every single Build Android APK run has failed at the
'Build release APK' step for this exact reason since the workflow was
created, regardless of code changes.

Add a 'Write release keystore' step that decodes an ANDROID_KEYSTORE_BASE64
secret into android/app/upload-release.jks and writes keystore.properties
from ANDROID_KEYSTORE_STORE_PASSWORD / ANDROID_KEYSTORE_KEY_ALIAS /
ANDROID_KEYSTORE_KEY_PASSWORD secrets, validated with keytool before the
build runs. Mirrors the same materialize-from-secrets pattern already
used for the iOS ASC key.

Requires adding those 4 secrets in GitHub → Settings → Secrets and
variables → Actions before this actually produces a signed APK/AAB." || echo "(nothing to commit)"
git push origin master
echo "==> Done."
echo "Press any key to close."
read -n1
