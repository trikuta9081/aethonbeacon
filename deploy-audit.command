#!/bin/bash
cd "$(dirname "$0")"
rm -f .git/index.lock
git add App.tsx
git commit -m "20-dim audit fixes: intake mode all 17 issues, exit report tab names, 6 new community topics + seed messages"
git push origin HEAD
git push render HEAD
echo "✅ Pushed to both remotes"
