#!/bin/zsh
set -euxo pipefail

echo "== AethonBeacon Xcode Cloud post-clone setup =="

if [[ -n "${CI_WORKSPACE:-}" && -d "${CI_WORKSPACE}" ]]; then
  cd "${CI_WORKSPACE}"
else
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  cd "${SCRIPT_DIR}/.."
fi

# If Xcode Cloud is configured with ios/AethonBeacon.xcodeproj, CI_WORKSPACE may be ios.
if [[ -f "Podfile" && ! -f "package.json" && -f "../package.json" ]]; then
  cd ..
fi

echo "Repository: $(pwd)"
export PATH="/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/opt/node@22/bin:/usr/local/opt/node@22/bin:/opt/homebrew/opt/node/bin:/usr/local/opt/node/bin:${PATH}"
export RUBYOPT="${RUBYOPT:-} -rlogger"

if ! command -v node >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    brew install node@22 || brew install node
    export PATH="/opt/homebrew/opt/node@22/bin:/usr/local/opt/node@22/bin:/opt/homebrew/opt/node/bin:/usr/local/opt/node/bin:${PATH}"
  else
    echo "Node.js is required but was not found and Homebrew is unavailable."
    exit 127
  fi
fi

node --version
npm --version

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
  gem install --user-install cocoapods -N
  export PATH="${HOME}/.gem/ruby/$(ruby -e 'print RUBY_VERSION[/^\d+\.\d+/]')/bin:${PATH}"
fi

pod --version
pod install

test -f "Pods/Target Support Files/Pods-AethonBeacon/Pods-AethonBeacon.release.xcconfig"
test -f "AethonBeacon.xcworkspace/contents.xcworkspacedata"

echo "== Xcode Cloud post-clone setup complete =="
