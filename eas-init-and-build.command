#!/bin/bash
# Load node via nvm (already installed)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

cd ~/AethonBeacon || { echo "❌ Cannot find AethonBeacon folder"; read -n1; exit 1; }

echo "================================================"
echo "  NAYIQ → EAS Init + TestFlight Build"
echo "================================================"
echo ""
echo "✅ Node: $(node -v)"
echo "✅ Logged in as: $(npx expo whoami 2>/dev/null)"
echo ""

echo "🔗 Initialising EAS project (links this app to your Expo account)..."
echo "   → If asked 'Create a new EAS project?' press Enter (Yes)"
echo ""
pnpm dlx eas-cli init

echo ""
echo "🏗️  Starting iOS build + auto-submit to TestFlight..."
echo "   (takes ~15-20 min on Expo servers)"
echo "   (will ask for Apple ID: slathiarimple567@gmail.com)"
echo ""
pnpm dlx eas-cli build --platform ios --profile production --auto-submit

echo ""
echo "✅ Done! Check: https://appstoreconnect.apple.com"
echo "Press any key to close."
read -n1
