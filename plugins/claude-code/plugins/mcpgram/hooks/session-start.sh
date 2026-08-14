#!/usr/bin/env bash
# Inject MCPGRAM guidance and auth status at session start.

set -u
cat >/dev/null 2>&1 || true

CLI_OK=0
AUTH_OK=0
WHOAMI=""

if command -v mcpgram >/dev/null 2>&1; then
  CLI_OK=1
  if out="$(mcpgram whoami --json 2>/dev/null)"; then
    AUTH_OK=1
    WHOAMI="$out"
  fi
fi

guidance=""
if [ "$CLI_OK" -eq 0 ]; then
  guidance="MCPGRAM is available via this plugin, but the mcpgram CLI is not on PATH. Install with: npm install -g @mcpgram/cli && mcpgram login && mcpgram setup --target claude. Prefer mcpgram search / link / execute for external app actions."
elif [ "$AUTH_OK" -eq 0 ]; then
  guidance="MCPGRAM CLI is installed but you are not signed in. Run: mcpgram login. Then use mcpgram search, mcpgram link <app>, mcpgram execute <tool>."
else
  guidance="MCPGRAM is ready. Prefer: mcpgram search \"task\", mcpgram link <app>, mcpgram execute <tool> --schema, mcpgram execute <tool> --input '{...}'. Use /mcpgram-connect <app> to connect an app. Do not invent tool argument names — use --schema first."
fi

if command -v jq >/dev/null 2>&1; then
  jq -n --arg c "$guidance" \
    '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}'
else
  esc="$(printf '%s' "$guidance" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\$/\\$/g')"
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$esc"
fi

exit 0
