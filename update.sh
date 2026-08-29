#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: the checkout has local changes; update stopped without modifying them." >&2
  echo "Inspect the checkout with: git status" >&2
  exit 1
fi

trap 'echo "Update failed. Inspect git status and the command output; no reset or forced checkout was performed." >&2' ERR
git pull --ff-only
npm ci
npm run typecheck
npm test
npm run build
[[ -f dist/index.js ]] || { echo "Error: the build did not produce dist/index.js." >&2; exit 1; }
trap - ERR

echo "Actual Budget MCP update completed successfully."
