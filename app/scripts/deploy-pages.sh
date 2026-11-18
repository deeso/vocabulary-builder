#!/usr/bin/env bash
# Manual deploy: build the PWA and force-push app/dist to the `gh-pages` branch.
# (The GitHub Actions workflow is the automatic path; this is the fallback.)
# Usage: npm run deploy:pages
set -euo pipefail
cd "$(dirname "$0")/.."

npm run -s build:web

ORIGIN=$(git -C .. remote get-url origin)
NAME=$(git -C .. config user.name)
EMAIL=$(git -C .. config user.email)
REV=$(git -C .. rev-parse --short HEAD)

cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name="$NAME" -c user.email="$EMAIL" commit -q -m "Deploy ${REV}"
# Use gh's stored login for HTTPS pushes when available.
if command -v gh >/dev/null 2>&1; then
  git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push -f -q "$ORIGIN" gh-pages
else
  git push -f -q "$ORIGIN" gh-pages
fi
rm -rf .git
echo "Deployed ${REV} to gh-pages"
