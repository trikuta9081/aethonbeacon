#!/bin/bash
cd ~/AethonBeacon
rm -f .git/HEAD.lock .git/index.lock
git add -A
git commit -m "fix: remove Daily Loop, Beacon Guide, Journal, Follow-up; fix 35+ contrast issues; counsel-first routing"
git push origin master
git push render master
echo ""
echo "Done! Web app redeploying at aethonbeacon.com"
