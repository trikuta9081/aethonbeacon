#!/bin/bash
echo ""
echo "This script is retired -- use deploy_live.command instead."
echo "(It also had a latent bug: it pushed to render's \"master\" branch,"
echo "but Render actually watches \"main\" -- so it was silently pushing to a"
echo "branch nobody watches and never triggered a deploy. deploy_live.command"
echo "pushes to the correct branch every time.)"
echo ""
read -n1 -r -p "Press any key to close..."
