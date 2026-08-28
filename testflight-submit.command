#!/bin/bash
cd ~/AethonBeacon || { echo "❌ Cannot find AethonBeacon folder"; read -n1; exit 1; }

# ── Load Node / npx from every common location ──────────────────────────────
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"          # nvm
export VOLTA_HOME="$HOME/.volta"
[ -d "$VOLTA_HOME/bin" ] && export PATH="$VOLTA_HOME/bin:$PATH"  # volta
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"            # homebrew / system
source ~/.zshrc 2>/dev/null || true                             # user custom paths
source ~/.bashrc 2>/dev/null || true
source ~/.bash_profile 2>/dev/null || true

# Last resort: find node binary anywhere on disk
if ! command -v npx &>/dev/null; then
  NODE_BIN=$(find /usr/local /opt/homebrew "$HOME/.nvm" "$HOME/.volta" "$HOME/.local" \
             -name "npx" -type f 2>/dev/null | head -1)
  [ -n "$NODE_BIN" ] && export PATH="$(dirname "$NODE_BIN"):$PATH"
fi

echo "================================================"
echo "  NAYIQ → TestFlight Submission"
echo "================================================"
echo ""

if ! command -v npx &>/dev/null; then
  echo "❌ Cannot find npx / Node.js."
  echo ""
  echo "Fix: open a NEW Terminal window and run:"
  echo "   brew install node"
  echo "   (or download from https://nodejs.org)"
  echo ""
  echo "Then double-click testflight-submit.command again."
  echo ""
  echo "Press any key to close."
  read -n1; exit 1
fi

echo "✅ Found npx at: $(which npx)"
echo ""

# Install EAS CLI if needed
if ! pnpm dlx eas-cli --version &>/dev/null 2>&1; then
  echo "📦 Installing EAS CLI..."
  pnpm dlx eas-cli --version >/dev/null 2>&1 || true
fi

# Log in to Expo if not already logged in
EXPO_USER=$(npx expo whoami 2>/dev/null | grep -v "^$" | head -1)
if [ -z "$EXPO_USER" ] || echo "$EXPO_USER" | grep -qi "not logged\|error"; then
  echo "🔐 Logging in to Expo (use slathiarimple567@gmail.com)..."
  npx expo login
  EXPO_USER=$(npx expo whoami 2>/dev/null | head -1)
fi

echo "✅ Logged in as: $EXPO_USER"

# Update app.json owner
if [ -n "$EXPO_USER" ]; then
  python3 -c "
import json
with open('app.json','r') as f: d=json.load(f)
d['expo']['owner']='$EXPO_USER'
with open('app.json','w') as f: json.dump(d,f,indent=2)
print('✅ app.json owner set to: $EXPO_USER')
"
fi

echo ""
echo "🏗️  Starting EAS iOS build + auto-submit to TestFlight..."
echo "   (~15-20 min on Expo servers, may ask for Apple ID)"
echo ""
pnpm dlx eas-cli build --platform ios --profile production --auto-submit

echo ""
echo "✅ Done! Check: https://appstoreconnect.apple.com"
echo "Press any key to close."
read -n1
