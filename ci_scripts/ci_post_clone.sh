#!/bin/zsh
set -euo pipefail

echo "== AethonBeacon Xcode Cloud post-clone setup =="

if [[ -n "${CI_WORKSPACE:-}" && -d "${CI_WORKSPACE}" ]]; then
  cd "${CI_WORKSPACE}"
else
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  cd "${SCRIPT_DIR}/.."
fi

echo "Repository: $(pwd)"
node --version
npm --version

# CocoaPods on some macOS/Ruby images needs Logger preloaded for ActiveSupport.
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
