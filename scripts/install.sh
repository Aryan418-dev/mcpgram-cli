#!/usr/bin/env bash
# MCPGRAM CLI installer — public entrypoint
# curl -fsSL https://mcpgram.vercel.app/install | bash
set -euo pipefail
Bold='\033[1m'; Green='\033[0;32m'; Cyan='\033[0;36m'; Dim='\033[0;2m'; Red='\033[0;31m'; Off='\033[0m'
info(){ echo -e "${Dim}$*${Off}"; }; success(){ echo -e "${Green}$*${Off}"; }; error(){ echo -e "${Red}error:${Off} $*" >&2; exit 1; }; step(){ echo -e "${Cyan}→${Off} $*"; }
echo; echo -e "${Bold}  MCPGRAM${Off}"; echo -e "${Dim}  Universal AI agent platform${Off}"; echo
OS=$(uname -s 2>/dev/null || echo unknown)
ARCH=$(uname -m 2>/dev/null || echo unknown)
step "Detecting system…"; info "  OS: $OS"; info "  Arch: $ARCH"
command -v node >/dev/null || error "Node.js 18+ required — https://nodejs.org"
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
[[ "$NODE_MAJOR" -ge 18 ]] || error "Node.js 18+ required (found $(node -v 2>/dev/null || echo ?))"
command -v npm >/dev/null || error "npm is required"
step "Installing MCPGRAM CLI…"
if ! npm install -g @mcpgram/cli --silent >/dev/null 2>&1; then
  if curl -fsSL https://mcpgram.vercel.app/cli/package.tgz -o /tmp/mcpgram-cli.tgz 2>/dev/null; then
    npm install -g /tmp/mcpgram-cli.tgz --silent >/dev/null 2>&1 || error "Install failed"
  else
    error "Could not install MCPGRAM CLI. Check your network and try again."
  fi
fi
NPM_BIN=$(npm prefix -g 2>/dev/null)/bin
if [[ -d "$NPM_BIN" ]]; then
  case ":$PATH:" in *":$NPM_BIN:"*) ;; *)
    export PATH="$NPM_BIN:$PATH"
    MARKER="# MCPGRAM CLI"
    RC="${HOME}/.zshrc"; [[ "${SHELL:-}" == *bash* ]] && RC="${HOME}/.bashrc"
    touch "$RC" 2>/dev/null || true
    if [[ -w "$RC" ]] && ! grep -qF "$MARKER" "$RC" 2>/dev/null; then
      printf '\n%s\nexport PATH="%s:$PATH"\n' "$MARKER" "$NPM_BIN" >>"$RC"
      info "  PATH updated in $RC"
    fi
  ;; esac
fi
echo
if command -v mcpgram >/dev/null 2>&1; then
  success "✓ MCPGRAM CLI installed"; success "✓ PATH configured"
  info "  $(command -v mcpgram)"
else
  echo -e "${Dim}Open a new terminal if mcpgram is not found yet.${Off}"
fi
echo; echo -e "${Bold}Next steps${Off}"; echo
echo -e "  ${Cyan}mcpgram login${Off}"; echo -e "  ${Cyan}mcpgram onboard${Off}"; echo
