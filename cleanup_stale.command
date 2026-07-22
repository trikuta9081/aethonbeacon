#!/bin/bash
set -e
cd ~/AethonBeacon
echo "==> Removing stale build artifacts, backups, and logs..."

# Old .ipa files — superseded by TestFlight build 42 (1.0.4), archived directly via Xcode.
rm -f AethonBeacon.ipa AethonBeacon_resigned.ipa

# Stale dist backups from earlier troubleshooting sessions.
rm -rf dist.bkp.1783660003 dist_v6

# One-off diagnostic logs from past debugging sessions — no longer needed.
rm -f archive_log.txt fix_safari_log.txt patch_log.txt portal_js_log.txt profile_log.txt safari_dev_log.txt

# macOS junk files.
rm -f .DS_Store ._credentials.example.json ._docker-compose.verification.yml ._render.yaml

echo "==> Done. Freed space:"
du -sh . 2>/dev/null | tail -1

echo ""
echo "Press any key to close."
read -n1
