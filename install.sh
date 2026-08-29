#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${ACTUAL_DATA_DIR:-/tmp/actual-budget-mcp}"

command -v node >/dev/null 2>&1 || { echo "Error: Node.js 22 or newer is required." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Error: npm is required." >&2; exit 1; }

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if (( NODE_MAJOR < 22 )); then
  echo "Error: Node.js 22 or newer is required; found $(node --version)." >&2
  exit 1
fi

cd "$PROJECT_DIR"
if [[ -f package-lock.json ]]; then
  npm ci
else
  echo "Error: package-lock.json is required for a reproducible installation." >&2
  exit 1
fi
npm run build

[[ -f dist/index.js ]] || { echo "Error: the build did not produce dist/index.js." >&2; exit 1; }
mkdir -p "$DATA_DIR"

echo "Actual Budget MCP installation completed."
echo "Recommended Hermes command: node"
echo "Recommended Hermes argument: $PROJECT_DIR/dist/index.js"
echo "Set ACTUAL_SERVER_URL, ACTUAL_PASSWORD, ACTUAL_SYNC_ID, and ACTUAL_DATA_DIR in Hermes."
