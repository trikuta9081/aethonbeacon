#!/bin/bash
echo "================================================"
echo "  Step 1: Install Node.js via NVM"
echo "================================================"
echo ""

export NVM_DIR="$HOME/.nvm"

# Install NVM if not present
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "📦 Downloading NVM..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.5/install.sh | bash
fi

# Load NVM
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# Install Node LTS
echo "📦 Installing Node.js LTS..."
nvm install --lts
nvm use --lts

echo ""
echo "✅ Node: $(node -v)"
echo "✅ npx:  $(which npx)"
echo ""

echo "================================================"
echo "  Step 2: Submit to TestFlight"
echo "================================================"
echo ""

cd ~/AethonBeacon || { echo "❌ AethonBeacon folder not found"; read -n1; exit 1; }

# Install EAS CLI globally
echo "📦 Installing EAS CLI..."
npm install -g eas-cli 2>/dev/null || true

# Log in to Expo
echo ""
echo "🔐 Log in to Expo — use: slathiarimple567@gmail.com"
echo ""
npx expo login

EXPO_USER=$(npx expo whoami 2>/dev/null | grep -v "^$" | head -1)
echo "✅ Logged in as: $EXPO_USER"

# Update app.json owner
if [ -n "$EXPO_USER" ]; then
  python3 -c "
import json
with open('app.json','r') as f: d=json.load(f)
d['expo']['owner']='$EXPO_USER'
with open('app.json','w') as f: json.dump(d,f,indent=2)
print('✅ app.json owner updated')
"
fi

echo ""
echo "🏗️  Building iOS app + submitting to TestFlight..."
echo "   (takes ~15-20 min on Expo servers)"
echo "   (may ask for Apple ID: slathiarimple567@gmail.com)"
echo ""
pnpm dlx eas-cli build --platform ios --profile production --auto-submit

echo ""
echo "✅ Done! Check: https://appstoreconnect.apple.com"
echo ""
echo "Press any key to close."
read -n1
