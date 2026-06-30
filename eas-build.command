#!/bin/bash
# Load node via nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

cd ~/AethonBeacon || { echo "❌ Cannot find AethonBeacon folder"; read -n1; exit 1; }

echo "================================================"
echo "  Aethon Beacon → TestFlight Build"
echo "================================================"
echo ""
echo "✅ Node: $(node -v)"
echo "✅ Logged in as: $(pnpm dlx eas-cli whoami 2>/dev/null || npx expo whoami 2>/dev/null)"
echo ""

# Register project with EAS (creates project on Expo servers)
# --non-interactive will auto-confirm project creation
echo "🔗 Registering project with EAS..."
pnpm dlx eas-cli init --non-interactive 2>/dev/null || true

echo ""
echo "🏗️  Building iOS + submitting to TestFlight..."
echo "   When asked for Apple ID, enter: slathiarimple567@gmail.com"
echo ""

# Run the EAS build
pnpm dlx eas-cli build --platform ios --profile production --auto-submit --non-interactive

echo ""
echo "✅ Done! Check https://appstoreconnect.apple.com"
echo "Press any key to close."
read -n1
