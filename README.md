# MCPGRAM CLI

Official command-line companion for [MCPGRAM](https://mcpgram.vercel.app).

**Install once → login once → configure every AI agent automatically.**

## Install

```bash
curl -fsSL https://mcpgram.vercel.app/install | bash
```

Or with npm (after publish):

```bash
npm install -g @mcpgram/cli
```

Windows (PowerShell):

```powershell
irm https://mcpgram.vercel.app/install.ps1 | iex
```

Then:

```bash
mcpgram onboard
```

## Quick start

```bash
mcpgram login          # browser PKCE (or API key)
mcpgram scan           # detect AI agents on this machine
mcpgram setup --all    # configure every detected agent
mcpgram doctor         # health check
```

Or in one step:

```bash
mcpgram onboard
```

## Commands

| Command | Description |
|--------|-------------|
| `mcpgram login` | Browser PKCE or API key |
| `mcpgram logout` | Sign out |
| `mcpgram whoami` | Show session |
| `mcpgram onboard` | Login + scan + setup + doctor |
| `mcpgram scan` | Detect installed AI agents |
| `mcpgram agents` | List providers + config status |
| `mcpgram setup [agent]` | Configure agents |
| `mcpgram setup --all` | Configure all detected agents |
| `mcpgram repair` | Fix broken configs |
| `mcpgram uninstall [agent]` | Remove MCPGRAM from agents |
| `mcpgram doctor` | Diagnostics |
| `mcpgram sync` | Refresh MCP servers + agent configs |
| `mcpgram update` | Update the CLI |
| `mcpgram mcp list` | List workspace MCP servers |
| `mcpgram mcp add <url>` | Connect external MCP server |
| `mcpgram mcp remove <id>` | Disconnect server |
| `mcpgram mcp refresh <id>` | Re-discover tools |
| `mcpgram tools` | List tools |
| `mcpgram tools search <q>` | Search tools |
| `mcpgram tools info <name>` | Tool schema |
| `mcpgram app list` | Connected apps |
| `mcpgram app connect [provider]` | Open dashboard connect flow |
| `mcpgram workspace list` | List workspaces |
| `mcpgram workspace switch <id>` | Set default workspace |
| `mcpgram info` | Endpoints + session |
| `mcpgram version` | Print version |

## Supported agents

Claude Code · Claude Desktop · Cursor · VS Code · Codex · Gemini CLI · OpenCode · Cline · Windsurf · Goose · Amp · Aider

## Authentication

- **Browser (default):** Authorization Code + PKCE against the MCPGRAM OAuth AS (same identity as dashboard & MCP clients).
- **API key:** `mcpgram login --key <key>` or `MCPGRAM_API_KEY` for CI/CD and automation.

There is one MCPGRAM account across dashboard, CLI, and MCP server.

## Environment (optional)

| Variable | Purpose |
|----------|---------|
| `MCPGRAM_API_KEY` | Workspace API key |
| `MCPGRAM_APP_URL` | Dashboard base URL |
| `MCPGRAM_MCP_URL` | MCP HTTP endpoint |
| `MCPGRAM_API_URL` | API base (defaults to app URL) |

## Local development

```bash
npm install
npm run build
npm test
npm link
mcpgram --help
```

## License

MIT
