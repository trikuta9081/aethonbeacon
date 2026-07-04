#!/bin/bash
cd "$(dirname "$0")/ios"
echo "Running pod install to apply Podfile changes..."
pod install
echo ""
echo "✅ Done! Now reopen AethonBeacon.xcworkspace in Xcode and rebuild."
echo "   The Issue Navigator warnings should be cleared after rebuild."
