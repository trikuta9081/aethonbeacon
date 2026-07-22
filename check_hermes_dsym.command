#!/bin/bash
set -e
cd ~/AethonBeacon/ios
echo "================================================"
echo "  Hermes dSYM diagnostic"
echo "================================================"
BIN="Pods/hermes-engine/destroot/Library/Frameworks/universal/hermesvm.xcframework/ios-arm64/hermesvm.framework/hermesvm"
if [ ! -f "$BIN" ]; then
  echo "Could not find hermesvm binary at expected path. Run 'pod install' first."
  read -n1
  exit 1
fi

echo ""
echo "-- File info --"
file "$BIN"

echo ""
echo "-- UUID (dwarfdump) --"
dwarfdump --uuid "$BIN" || true

echo ""
echo "-- Checking for embedded DWARF debug segment (otool -l) --"
if otool -l "$BIN" | grep -q "__DWARF"; then
  echo "RESULT: Binary DOES contain an embedded __DWARF segment."
  echo "Attempting to extract a dSYM with dsymutil..."
  mkdir -p /tmp/hermes_dsym_check
  dsymutil "$BIN" -o /tmp/hermes_dsym_check/hermesvm.framework.dSYM
  if [ -d /tmp/hermes_dsym_check/hermesvm.framework.dSYM ]; then
    echo "SUCCESS: dSYM generated at /tmp/hermes_dsym_check/hermesvm.framework.dSYM"
    echo "This CAN be fixed with a Run Script build phase."
  else
    echo "dsymutil ran but produced no dSYM bundle. Debug info likely stripped."
  fi
else
  echo "RESULT: No __DWARF segment found. The binary is fully stripped of debug info."
  echo "This means there is NO way to recover symbols for this build — Meta's"
  echo "hermes-engine release artifact simply does not include them for this version."
  echo "This is a known upstream gap, not something fixable from this project."
fi

echo ""
echo "Press any key to close."
read -n1
