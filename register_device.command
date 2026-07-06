#!/bin/bash
# Get Mac UUID
UUID=$(system_profiler SPHardwareDataType | grep "Hardware UUID" | awk '{print $NF}')
echo "Mac UDID: $UUID"
# Copy to clipboard
echo -n "$UUID" | pbcopy
echo "UDID copied to clipboard!"
echo ""
echo "Opening Apple Developer Portal..."
echo ""
echo "Steps once the page opens:"
echo "  1. Click '+' (Register a Device)"
echo "  2. Platform: Mac"
echo "  3. Device Name: Dev Mac"
echo "  4. Device ID (UUID): $UUID  ← already in your clipboard, just paste"
echo "  5. Click Continue, then Register"
echo "  6. Come back and run archive_ios2.command"
echo ""
open "https://developer.apple.com/account/resources/devices/add"
