#!/bin/zsh
set -euo pipefail

echo "== AethonBeacon Xcode Cloud post-clone setup from ios/ci_scripts =="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

echo "Repository: $(pwd)"
node --version
npm --version

export RUBYOPT="${RUBYOPT:-} -rlogger"

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@10.11.0 --activate
  else
    npm install --global pnpm@10.11.0
  fi
fi

pnpm --version
pnpm install --frozen-lockfile

cd ios
if ! command -v pod >/dev/null 2>&1; then
  sudo gem install cocoapods -N
fi

pod --version
pod install

test -f "Pods/Target Support Files/Pods-AethonBeacon/Pods-AethonBeacon.release.xcconfig"
test -f "AethonBeacon.xcworkspace/contents.xcworkspacedata"

echo "== Xcode Cloud post-clone setup complete =="
