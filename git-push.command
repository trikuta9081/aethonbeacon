#!/bin/bash
cd ~/AethonBeacon || { echo "❌ Cannot find AethonBeacon folder"; read -n1; exit 1; }

rm -f .git/index.lock 2>/dev/null
git config user.email "trikuta9081@gmail.com"
git config user.name "Rajeshwar"

# Read token from file
TOKEN_FILE=~/AethonBeacon/github-token.txt
if [ ! -f "$TOKEN_FILE" ]; then
  echo ""
  echo "================================================"
  echo "  STEP 1: Create your GitHub token"
  echo "================================================"
  echo ""
  echo "  → Go to: https://github.com/settings/tokens/new"
  echo "  → Note: AethonBeacon2"
  echo "  → Expiration: No expiration"
  echo "  → Check the TOP 'repo' checkbox"
  echo "  → Click Generate token"
  echo "  → Copy the ghp_... token"
  echo ""
  echo "  STEP 2: Save the token"
  echo "  → Open TextEdit on your Mac"
  echo "  → Paste the token (Cmd+V)"
  echo "  → Save As: github-token.txt"
  echo "  → Save location: AethonBeacon folder"
  echo ""
  echo "  STEP 3: Double-click git-push.command again"
  echo ""
  echo "Press any key to close."
  read -n1
  exit 0
fi

GH_TOKEN=$(cat "$TOKEN_FILE" | tr -d '[:space:]')

if [ -z "$GH_TOKEN" ]; then
  echo "❌ Token file is empty. Save your ghp_... token in github-token.txt"
  read -n1; exit 1
fi

echo "🔑 Token loaded from github-token.txt"

# Set remote with token
git remote set-url origin "https://trikuta9081:${GH_TOKEN}@github.com/trikuta9081/aethonbeacon.git"
git config --global credential.helper osxkeychain

echo "🚀 Pushing to github.com/trikuta9081/aethonbeacon ..."
git push -u origin master 2>&1

STATUS=$?

# Clean token from remote URL
git remote set-url origin "https://github.com/trikuta9081/aethonbeacon.git"

if [ $STATUS -eq 0 ]; then
  # Delete the token file for security
  rm -f "$TOKEN_FILE"
  echo ""
  echo "✅ Push successful! Token file deleted for security."
  echo "   https://github.com/trikuta9081/aethonbeacon"
else
  echo ""
  echo "❌ Push failed. Check token has 'repo' scope."
fi

echo ""
echo "Press any key to close."
read -n1
