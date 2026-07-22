#!/bin/bash
set -e
cd ~/AethonBeacon
rm -f .git/index.lock .git/HEAD.lock
git add -A
git commit -m "CI: surface ASC key normalization failure as a public annotation

Previous run (664d40f) still failed at the same step, but for a
different reason than the YAML/heredoc bug — the failure is now
inside normalize_asc_key.py or the openssl PEM check itself. Add
non-secret-leaking diagnostics (secret length, whether it already
has a PEM header) and route any failure through ::error:: so the
real cause shows up in the public Annotations panel without needing
to sign into GitHub to view raw logs." || echo "(nothing to commit)"
git push origin master
echo "==> Done."
echo "Press any key to close."
read -n1
