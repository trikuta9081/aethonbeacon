#!/bin/bash
# AethonBeacon — GitHub push script
# Run by double-clicking in Finder

cd ~/AethonBeacon || { echo "❌ Cannot find AethonBeacon folder"; read -n1; exit 1; }

echo ""
echo "================================================"
echo "  AethonBeacon → GitHub Push"
echo "================================================"
echo ""

# Clean stale lock
rm -f .git/index.lock 2>/dev/null

# Init git if needed
if [ ! -d ".git" ]; then
  echo "🔧 Initialising git repository..."
  git init
  git branch -M main
fi

# Identity
git config user.email "trikuta9081@gmail.com"
git config user.name "Rajeshwar"

# .gitignore
cat > .gitignore << 'IGNORE'
node_modules/
.expo/
dist/
ios/Pods/
android/.gradle/
android/build/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
.DS_Store
._*
IGNORE

# Stage everything
git add -A
echo "📦 Files staged:"
git status --short | grep -v node_modules | head -30
echo ""

# Commit
git commit -m "feat: Gemini AI (brief/journal/insights), Supabase sync, per-tab error boundaries, notifications" 2>/dev/null \
  || echo "  (nothing new to commit, continuing to push)"

echo ""

# Remote — prompt if not set
if ! git remote get-url origin &>/dev/null; then
  echo "================================================"
  echo "  ONE-TIME SETUP NEEDED"
  echo "================================================"
  echo ""
  echo "  Create a GitHub repo first:"
  echo "  → https://github.com/new"
  echo "  → Name it: AethonBeacon"
  echo "  → Leave it EMPTY (no README)"
  echo ""
  read -p "  Then enter your GitHub username here: " GH_USER
  if [ -z "$GH_USER" ]; then
    echo "❌ No username entered. Run again after creating the repo."
    read -n1; exit 1
  fi
  git remote add origin "https://github.com/$GH_USER/AethonBeacon.git"
fi

# Push
echo "🚀 Pushing to GitHub..."
git push -u origin main 2>&1 || git push -u origin master 2>&1

REMOTE_URL=$(git remote get-url origin | sed 's|.git$||')
echo ""
echo "✅ Done! View at: $REMOTE_URL"
echo ""
echo "Press any key to close."
read -n1
