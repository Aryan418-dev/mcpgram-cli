#!/usr/bin/env bash
# MCPGRAM CLI installer — public entrypoint
# curl -fsSL https://mcpgram.vercel.app/install | bash
set -euo pipefail

Bold='\033[1m'; Green='\033[0;32m'; Cyan='\033[0;36m'; Dim='\033[0;2m'; Red='\033[0;31m'; Off='\033[0m'
info(){ echo -e "${Dim}$*${Off}"; }
success(){ echo -e "${Green}$*${Off}"; }
error(){ echo -e "${Red}error:${Off} $*" >&2; exit 1; }
step(){ echo -e "${Cyan}→${Off} $*"; }

echo
echo -e "${Bold}  MCPGRAM${Off}"
echo -e "${Dim}  Universal AI agent platform${Off}"
echo

OS=$(uname -s 2>/dev/null || echo unknown)
ARCH=$(uname -m 2>/dev/null || echo unknown)
step "Detecting system…"
info "  OS: $OS"
info "  Arch: $ARCH"

command -v node >/dev/null || error "Node.js 18+ required — https://nodejs.org"
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
[[ "$NODE_MAJOR" -ge 18 ]] || error "Node.js 18+ required (found $(node -v 2>/dev/null || echo ?))"
command -v npm >/dev/null || error "npm is required"
info "  Node: $(node -v)"
info "  npm:  $(npm -v 2>/dev/null || echo ?)"

INSTALL_BASE="${MCPGRAM_INSTALL_BASE:-https://mcpgram.vercel.app}"
PKG="@mcpgram/cli@latest"

step "Installing MCPGRAM CLI ($PKG)…"
NPM_LOG=$(mktemp 2>/dev/null || echo /tmp/mcpgram-npm-install.log)
if npm install -g "$PKG" >"$NPM_LOG" 2>&1; then
  success "  Installed from npm registry"
else
  info "  npm registry install failed; trying package mirror…"
  TGZ="${TMPDIR:-/tmp}/mcpgram-cli.tgz"
  if curl -fsSL "$INSTALL_BASE/cli/package.tgz" -o "$TGZ" 2>/dev/null; then
    if npm install -g "$TGZ" >"$NPM_LOG" 2>&1; then
      success "  Installed from package mirror"
    else
      tail -n 20 "$NPM_LOG" 2>/dev/null || true
      error "Install failed. Try: npm install -g @mcpgram/cli@latest"
    fi
  else
    tail -n 20 "$NPM_LOG" 2>/dev/null || true
    error "Could not install MCPGRAM CLI. Check network / npm permissions, then: npm install -g @mcpgram/cli@latest"
  fi
fi

# Ensure global npm bin is on PATH for this session + shell rc
NPM_PREFIX=$(npm prefix -g 2>/dev/null || true)
NPM_BIN=""
if [[ -n "$NPM_PREFIX" ]]; then
  NPM_BIN="$NPM_PREFIX/bin"
fi
if [[ -z "$NPM_BIN" || ! -d "$NPM_BIN" ]]; then
  NPM_BIN=$(npm bin -g 2>/dev/null || true)
fi

if [[ -n "$NPM_BIN" && -d "$NPM_BIN" ]]; then
  case ":$PATH:" in
    *":$NPM_BIN:"*) ;;
    *)
      export PATH="$NPM_BIN:$PATH"
      MARKER="# MCPGRAM CLI"
      add_path_line() {
        local rc="$1"
        [[ -z "$rc" ]] && return 0
        touch "$rc" 2>/dev/null || return 0
        if [[ -w "$rc" ]] && ! grep -qF "$MARKER" "$rc" 2>/dev/null; then
          printf '\n%s\nexport PATH="%s:$PATH"\n' "$MARKER" "$NPM_BIN" >>"$rc"
          info "  PATH updated in $rc"
        fi
      }
      # bash / zsh
      SHELL_NAME=$(basename "${SHELL:-}")
      case "$SHELL_NAME" in
        zsh) add_path_line "${ZDOTDIR:-$HOME}/.zshrc" ;;
        bash)
          add_path_line "$HOME/.bashrc"
          add_path_line "$HOME/.bash_profile"
          ;;
        fish)
          FISH_CFG="$HOME/.config/fish/config.fish"
          mkdir -p "$(dirname "$FISH_CFG")" 2>/dev/null || true
          if [[ -w "$FISH_CFG" || ! -e "$FISH_CFG" ]] && ! grep -qF "$MARKER" "$FISH_CFG" 2>/dev/null; then
            printf '\n# %s\nset -gx PATH %s $PATH\n' "$MARKER" "$NPM_BIN" >>"$FISH_CFG"
            info "  PATH updated in $FISH_CFG"
          fi
          ;;
        *)
          add_path_line "$HOME/.profile"
          ;;
      esac
      ;;
  esac
fi

echo
if command -v mcpgram >/dev/null 2>&1; then
  VER=$(mcpgram --version 2>/dev/null || mcpgram version 2>/dev/null || echo "?")
  success "✓ MCPGRAM CLI installed"
  success "✓ PATH configured"
  info "  $(command -v mcpgram)"
  info "  version: $VER"
else
  echo -e "${Dim}Open a new terminal if mcpgram is not found yet.${Off}"
  echo -e "${Dim}Or run: export PATH=\"$(npm prefix -g)/bin:\$PATH\"${Off}"
fi

echo
echo -e "${Bold}Next steps${Off}"
echo
echo -e "  ${Cyan}mcpgram login${Off}"
echo -e "  ${Cyan}mcpgram onboard${Off}"
echo -e "  ${Cyan}mcpgram update${Off}   ${Dim}# upgrade later${Off}"
echo
