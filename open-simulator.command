#!/bin/bash

# ── PATH setup ───────────────────────────────────────────────────────────────
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
[ -f "$HOME/.zshrc" ]        && source "$HOME/.zshrc"        2>/dev/null
[ -f "$HOME/.zprofile" ]     && source "$HOME/.zprofile"     2>/dev/null
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$HOME/.gem/bin:$PATH"

cd ~/AethonBeacon || { echo "❌ AethonBeacon folder not found"; read -n1; exit 1; }

echo "================================================"
echo "  NAYIQ — iOS Simulator (Native Build)"
echo "================================================"
echo ""
echo "✅ Node: $(node -v)"
echo ""

# ── Check if Pods already installed ──────────────────────────────────────────
if [ -d "ios/Pods" ]; then
  echo "✅ CocoaPods already installed — skipping pod install"
else
  echo "📦 ios/Pods missing — running pod install..."
  if ! command -v pod &>/dev/null; then
    echo "🔧 Installing CocoaPods via gem (no sudo)..."
    gem install cocoapods --user-install
    export GEM_HOME="$HOME/.gem"
    export PATH="$HOME/.gem/bin:$PATH"
  fi
  cd ios && pod install && cd ..
fi

echo ""
echo "📱 Building and launching on iOS Simulator..."
echo ""

# ── Build and run ─────────────────────────────────────────────────────────────
npx expo run:ios

echo ""
echo "Press any key to close."
read -n1
