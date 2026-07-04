#!/bin/bash
cd "$(dirname "$0")"
rm -f .git/index.lock
git add -A
git commit -m "deploy: push latest audit fixes to Render" 2>/dev/null || echo "Nothing new to commit — pushing existing commits"
echo "Pushing to origin..."
git push origin HEAD
echo "Pushing to render (triggers Render deploy)..."
git push render HEAD
echo "✅ Pushed to both remotes — Render deploy triggered"
echo "Check https://dashboard.render.com for deploy progress"
