#!/usr/bin/env bash
# manual-render-deploy.sh
#
# Does exactly what .github/workflows/mirror-to-render.yml does, but on your
# own machine instead of GitHub Actions -- so it works even while GitHub
# Actions minutes are unavailable. No cost, no CI, no accounts needed beyond
# the git push access you already have to both repos.
#
# Run from anywhere; it cd's into the repo itself.
set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"
SRC_SHA="$(git rev-parse HEAD)"

echo "==> Verifying (typecheck + regression suites) before building anything for production..."
pnpm run typecheck
pnpm run test:tone
pnpm run test:vedic
pnpm run test:visibility
pnpm run test:product-quality
pnpm run test:upgrades

echo "==> Building web bundle from ${SRC_SHA}..."
EXPO_PUBLIC_VERIFICATION_API_BASE_URL="https://aethon-beacon-verification.onrender.com" \
EXPO_PUBLIC_SUPABASE_URL="https://isfkxmrathirqkrwfagg.supabase.co" \
EXPO_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_x2hdByZdsmU26qPDuy5pZA_1PztSSwv" \
pnpm run export:web

echo "==> Publishing to the Render-watched mirror repo via a throwaway worktree..."
WORKTREE_DIR="$(mktemp -d /tmp/aethon-render-mirror.XXXXXX)"
git worktree add --detach "$WORKTREE_DIR" >/dev/null
cleanup() {
  cd "$REPO_ROOT"
  git worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || true
}
trap cleanup EXIT

cd "$WORKTREE_DIR"
git checkout --orphan render-deploy >/dev/null
git rm -rf . >/dev/null 2>&1 || true
cp -R "$REPO_ROOT/dist" ./dist
mkdir -p scripts
cp "$REPO_ROOT/scripts/static-server.mjs" ./scripts/static-server.mjs
git add -A
git -c user.name="$(git -C "$REPO_ROOT" config user.name || echo aethon-manual-deploy)" \
    -c user.email="$(git -C "$REPO_ROOT" config user.email || echo manual@localhost)" \
    commit -m "chore(web): manual mirror from ${SRC_SHA}" >/dev/null
git push render render-deploy:main --force

echo "==> Done. Render will auto-deploy this within seconds -- check https://dashboard.render.com."
echo "    Source commit deployed: ${SRC_SHA}"
