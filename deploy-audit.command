#!/bin/bash
echo ""
echo "This script is retired -- use deploy_live.command instead."
echo "That one file now does the whole release: typecheck, rebuild the web"
echo "bundle, and push to BOTH GitHub remotes (origin for Android/iOS tester"
echo "builds, render for the live nayiq.co site) every time, so"
echo "nothing ships to one surface and silently misses another."
echo ""
read -n1 -r -p "Press any key to close..."
