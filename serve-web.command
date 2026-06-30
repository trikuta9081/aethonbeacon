#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

cd ~/AethonBeacon || { echo "❌ AethonBeacon folder not found"; read -n1; exit 1; }

echo "================================================"
echo "  Aethon Beacon — Web Preview"
echo "================================================"
echo ""

# Check if dist folder exists; if not, build it
if [ ! -f "dist/index.html" ]; then
  echo "📦 Building web export first..."
  npx expo export --platform web
  echo ""
fi

echo "🌐 Serving at http://localhost:3001"
echo "   Open your browser to: http://localhost:3001"
echo "   Press Ctrl+C to stop"
echo ""

# Use npx serve on port 3001 (avoids conflicts with port 3000)
npx serve dist -p 3001 -s
