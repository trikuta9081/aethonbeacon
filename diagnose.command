#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
cd ~/AethonBeacon

echo "=== EAS CLI version ===" 2>&1 | tee /tmp/expo-diag.txt
pnpm dlx eas-cli --version 2>&1 | tee -a /tmp/expo-diag.txt

echo "" | tee -a /tmp/expo-diag.txt
echo "=== Expo config test ===" | tee -a /tmp/expo-diag.txt
node node_modules/expo/bin/cli config --json 2>&1 | tee -a /tmp/expo-diag.txt

echo "" | tee -a /tmp/expo-diag.txt
echo "=== Done ===" | tee -a /tmp/expo-diag.txt
cp /tmp/expo-diag.txt ~/AethonBeacon/expo-diag-output.txt
echo "Output saved to ~/AethonBeacon/expo-diag-output.txt"
read -n1
