#!/bin/bash
echo "=== Apple Distribution Certificates in Keychain ===" > /tmp/cert_check.txt
security find-identity -v -p codesigning 2>&1 | grep -i "Apple Distribution\|iPhone Distribution\|Apple Development" >> /tmp/cert_check.txt
echo "" >> /tmp/cert_check.txt
echo "=== All Signing Identities ===" >> /tmp/cert_check.txt
security find-identity -v -p codesigning 2>&1 >> /tmp/cert_check.txt
echo "" >> /tmp/cert_check.txt
echo "=== Provisioning Profiles ===" >> /tmp/cert_check.txt
ls -la ~/Library/MobileDevice/Provisioning\ Profiles/ 2>/dev/null >> /tmp/cert_check.txt || echo "None found" >> /tmp/cert_check.txt
echo "" >> /tmp/cert_check.txt
echo "=== UDID of this Mac ===" >> /tmp/cert_check.txt
system_profiler SPHardwareDataType 2>/dev/null | grep "Hardware UUID" >> /tmp/cert_check.txt
cat /tmp/cert_check.txt
