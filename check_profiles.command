#!/bin/bash
echo "=== Provisioning Profiles ===" 
ls -la ~/Library/MobileDevice/Provisioning\ Profiles/ 2>/dev/null || echo "None found"
echo ""
echo "=== Profile Details ==="
for f in ~/Library/MobileDevice/Provisioning\ Profiles/*.mobileprovision 2>/dev/null; do
  [ -f "$f" ] || continue
  echo "File: $f"
  security cms -D -i "$f" 2>/dev/null | grep -E "Name|TeamIdentifier|ExpirationDate|ProvisionsAllDevices|ProvisionedDevices" | head -10
  echo "---"
done
echo "Done"
