#!/usr/bin/env bash
# Run Vocabulary Builder as a local web app in your browser.
#   ./start-local.sh          → http://localhost:4173/
#   ./start-local.sh --lan    → also reachable from phones/tablets on your Wi-Fi
#   ./start-local.sh --rebuild / --port 8080
set -euo pipefail
cd "$(dirname "$0")/app"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 24+ is required: https://nodejs.org/" >&2
  exit 1
fi
major=$(node -p 'process.versions.node.split(".")[0]')
if [ "$major" -lt 24 ]; then
  echo "Node.js 24+ is required (found $(node -v))." >&2
  exit 1
fi

[ -d node_modules ] || npm ci
exec node scripts/local.mjs "$@"
