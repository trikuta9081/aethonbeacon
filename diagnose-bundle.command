#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
cd ~/AethonBeacon

echo "=== Testing JS bundle locally ==="
echo "(This simulates what EAS does — shows exact error)"
echo ""

# Try to export/bundle to catch JS errors
npx expo export --platform ios 2>&1 | tee ~/AethonBeacon/bundle-error.txt

echo ""
echo "=== Done. Output saved to bundle-error.txt ==="
read -n1
