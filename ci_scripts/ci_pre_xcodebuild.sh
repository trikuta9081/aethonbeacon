#!/bin/zsh
set -euxo pipefail

# Canonical Xcode Cloud scripts live beside the selected iOS project/workspace.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "${SCRIPT_DIR}/../ios/ci_scripts/ci_pre_xcodebuild.sh" "$@"
