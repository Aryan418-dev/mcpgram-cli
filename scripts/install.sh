#!/usr/bin/env bash
# MCPGRAM CLI installer
# Usage: curl -fsSL https://raw.githubusercontent.com/Aryan418-dev/mcpgram-cli/main/scripts/install.sh | bash
set -euo pipefail

Bold='\033[1m'
Green='\033[0;32m'
Dim='\033[0;2m'
Red='\033[0;31m'
Off='\033[0m'

info() { echo -e "${Dim}$*${Off}"; }
success() { echo -e "${Green}$*${Off}"; }
error() { echo -e "${Red}error:${Off} $*" >&2; exit 1; }

echo -e "${Bold}MCPGRAM CLI installer${Off}"
echo

if ! command -v node >/dev/null 2>&1; then
  error "Node.js 18+ is required. Install from https://nodejs.org and re-run."
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  error "Node.js 18+ required (found $(node -v))"
fi

if ! command -v npm >/dev/null 2>&1; then
  error "npm is required"
fi

info "Installing @mcpgram/cli globally via npm…"

# Prefer GitHub until package is published to npm
if npm install -g @mcpgram/cli 2>/dev/null; then
  success "Installed @mcpgram/cli from npm"
else
  info "npm package not published yet — installing from GitHub"
  npm install -g "github:Aryan418-dev/mcpgram-cli" || \
    npm install -g "https://github.com/Aryan418-dev/mcpgram-cli.git" || \
    error "Failed to install mcpgram CLI"
  success "Installed from GitHub"
fi

if command -v mcpgram >/dev/null 2>&1; then
  success "mcpgram is on PATH: $(command -v mcpgram)"
  mcpgram --version || true
else
  NPM_BIN=$(npm bin -g 2>/dev/null || npm prefix -g)
  info "Add to PATH if needed: export PATH=\"$NPM_BIN:\$PATH\""
fi

echo
success "Next steps:"
echo "  mcpgram login"
echo "  mcpgram onboard"
echo "  mcpgram setup --all"
echo
info "Docs: https://github.com/Aryan418-dev/mcpgram-cli"
