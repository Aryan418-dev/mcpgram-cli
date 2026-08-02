#!/usr/bin/env bash
# Internal bootstrap used by branded install host
set -euo pipefail
NPM_PKG="@mcpgram/cli"
if command -v npm >/dev/null 2>&1; then
  npm install -g "$NPM_PKG" || true
fi
if command -v mcpgram >/dev/null 2>&1; then
  echo "mcpgram ready: $(command -v mcpgram)"
else
  echo "Install Node 18+ then: npm install -g @mcpgram/cli"
fi
