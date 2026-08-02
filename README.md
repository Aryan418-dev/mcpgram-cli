# MCPGRAM CLI

Official command-line companion for [MCPGRAM](https://mcpgram.vercel.app).

**Install once → login once → configure every AI agent automatically.**

```bash
curl -fsSL https://raw.githubusercontent.com/Aryan418-dev/mcpgram-cli/main/scripts/install.sh | bash
mcpgram onboard
```

## What it does

- Authenticates against your MCPGRAM workspace (API key)
- Detects installed agents (Claude Code, Cursor, Codex, VS Code, Gemini CLI, …)
- Writes the correct MCP config for each agent (no hand-editing JSON/TOML)
- Manages external MCP servers and tools via existing dashboard APIs
- Runs health checks and repairs broken configs

MCP endpoint used by agents:

`https://mcpgram-mcp-server.vercel.app/mcp`

## Install

### One-liner

```bash
curl -fsSL https://raw.githubusercontent.com/Aryan418-dev/mcpgram-cli/main/scripts/install.sh | bash
```

### npm

```bash
npm install -g @mcpgram/cli
# or from GitHub before npm publish:
npm install -g github:Aryan418-dev/mcpgram-cli
```

Requires **Node.js 18+**.

## Quick start

```bash
mcpgram login          # opens dashboard → paste workspace API key
mcpgram scan           # detect agents
mcpgram setup --all    # configure every detected agent
mcpgram doctor         # health check
```

Or all at once:

```bash
mcpgram onboard
```

## Commands

| Command | Description |
|--------|-------------|
| `mcpgram login` | Store workspace API key |
| `mcpgram logout` | Clear local credentials |
| `mcpgram whoami` | Show session |
| `mcpgram onboard` | Login + scan + setup + doctor |
| `mcpgram scan` | Detect installed AI agents |
| `mcpgram agents` | List providers + config status |
| `mcpgram setup [agent]` | Configure agents |
| `mcpgram setup --all` | Configure all detected agents |
| `mcpgram repair` | Fix broken MCPGRAM entries |
| `mcpgram uninstall [agent]` | Remove MCPGRAM from agent configs |
| `mcpgram doctor` | Diagnostics |
| `mcpgram sync` | Refresh external MCP servers |
| `mcpgram mcp list` | List workspace MCP servers |
| `mcpgram mcp add <url>` | Connect external MCP server |
| `mcpgram mcp remove <id>` | Disconnect server |
| `mcpgram mcp refresh <id>` | Re-discover tools |
| `mcpgram tools` | List tools |
| `mcpgram tools search <q>` | Search tools |
| `mcpgram tools info <name>` | Tool schema |
| `mcpgram info` | Show endpoints |

## Supported agents (provider plugins)

| ID | Agent |
|----|--------|
| `claude-code` | Claude Code |
| `claude-desktop` | Claude Desktop |
| `cursor` | Cursor |
| `vscode` | VS Code (project `.vscode/mcp.json`) |
| `codex` | Codex CLI (`~/.codex/config.toml`) |
| `gemini` | Gemini CLI |
| `opencode` | OpenCode |
| `cline` | Cline |
| `windsurf` | Windsurf |
| `goose` | Goose |
| `amp` | Amp |
| `aider` | Aider |

Adding a new agent = implement `AgentProvider` in `src/providers/` and register it in `src/providers/registry.ts`.

## Architecture

```
mcpgram CLI
├── auth / config (~/.mcpgram/config.json, mode 0600)
├── api client → https://mcpgram.vercel.app/api/v1/*
│                 (tools, execute, mcp-servers)
├── provider plugins (agent-specific config writers)
├── scanner / doctor / repair
└── install.sh
```

Reuses existing MCPGRAM dashboard APIs — no duplicated business logic.

## Environment

| Variable | Purpose |
|----------|---------|
| `MCPGRAM_API_KEY` | Override stored API key |
| `MCPGRAM_APP_URL` | Dashboard base (default `https://mcpgram.vercel.app`) |
| `MCPGRAM_API_URL` | API base (default same as app) |
| `MCPGRAM_MCP_URL` | MCP HTTP endpoint |

## Security

- Config written with mode `0600`
- Prefer `MCPGRAM_API_KEY` env in CI
- Never commit API keys
- Agent configs may embed Bearer headers when you log in with an API key; OAuth-only clients can use the URL without a header

## Development

```bash
git clone https://github.com/Aryan418-dev/mcpgram-cli
cd mcpgram-cli
npm install
npm run build
node dist/index.js --help
```

## License

MIT
