#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
[ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc" 2>/dev/null
[ -f "$HOME/.zprofile" ] && source "$HOME/.zprofile" 2>/dev/null
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$PATH"

cd ~/AethonBeacon || { echo "❌ AethonBeacon folder not found"; read -n1; exit 1; }

echo "========================================"
echo "  NAYIQ — Metro Bundler"
echo "========================================"
echo ""
echo "Starting Metro... The simulator app will"
echo "auto-connect once Metro is ready."
echo ""

npx expo start --port 8081
