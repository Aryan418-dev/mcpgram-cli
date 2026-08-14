# MCPGRAM CLI

Official command-line companion for [MCPGRAM](https://mcpgram.vercel.app).

**Install once → login once → configure every AI agent automatically.**

## Install

```bash
npm install -g @mcpgram/cli
```

Or:

```bash
curl -fsSL https://mcpgram.vercel.app/install | bash
```

Windows (PowerShell):

```powershell
irm https://mcpgram.vercel.app/install.ps1 | iex
```

```bash
mcpgram onboard
```

## Authentication

```bash
mcpgram login              # browser PKCE (preferred)
mcpgram login --key <key>  # CI / API key
mcpgram whoami
mcpgram whoami --json
mcpgram logout
```

Do **not** paste your MCPGRAM account password into the terminal. Login uses browser OAuth (PKCE) against the same identity as the dashboard and MCP clients, or a workspace API key.

Credentials are stored under `~/.mcpgram/config.json` with mode `0600`. Prefer `MCPGRAM_API_KEY` in CI so secrets never touch the file.

## Configuration

```bash
mcpgram config list
mcpgram config get apiBase
mcpgram config set apiBase https://mcpgram.vercel.app
```

Environment variables:

| Variable | Purpose |
|----------|---------|
| `MCPGRAM_API_KEY` | Workspace API key (preferred in CI) |
| `MCPGRAM_TOKEN` | Alias for API key / bearer |
| `MCPGRAM_API_URL` | Dashboard / API base |
| `MCPGRAM_MCP_URL` | MCP HTTP endpoint |
| `MCPGRAM_APP_URL` | Dashboard origin |
| `MCPGRAM_DEBUG` | Same as `--debug` |

## Servers

```bash
mcpgram servers list
mcpgram servers get <id>
mcpgram servers connect <url> --name my-mcp
mcpgram servers disconnect <id>
# legacy aliases:
mcpgram mcp list | add | remove | refresh
```

## Tools

```bash
mcpgram tools
mcpgram tools list --server <name>
mcpgram tools search gmail
mcpgram tools info linkedin_create_post
mcpgram tools --json
```

## Run a tool

```bash
mcpgram run linkedin_create_post --input '{"commentary":"Hello from CLI"}'
mcpgram run some.tool --to user@example.com --subject Hello
mcpgram run some.tool --json --input '{}'
```

Uses `POST /api/v1/execute` with `{ tool_id, input }`.

## Project workflow

```bash
mcpgram init my-mcp-server
cd my-mcp-server
mcpgram deploy          # validates mcpgram.json
mcpgram deploy --yes
```

## Logs, keys, marketplace

```bash
mcpgram logs            # links to dashboard Activity (session API)
mcpgram keys            # API keys managed in dashboard Settings
mcpgram marketplace search slack
```

These surface dashboard flows until dedicated Bearer `/api/v1` endpoints exist.

## Agents

```bash
mcpgram scan
mcpgram setup --all
mcpgram agents
mcpgram doctor
mcpgram sync
```

Supported: Claude Code · Claude Desktop · Cursor · VS Code · Codex · Gemini CLI · OpenCode · Cline · Windsurf · Goose · Amp · Aider

## Global flags

```
--json     JSON only on stdout
--debug    Stack traces
--quiet    Less human output
--yes      Non-interactive / CI
--version  0.3.0
--help
```

## Security

- Tokens are never printed in full (`maskSecret`)
- Config file mode `0600`
- No password login in the terminal
- Tool execution does not shell out to tool arguments
- Do not commit `.env` or `~/.mcpgram/config.json`

## Development

```bash
npm install
npm test
npm link
mcpgram --version
```

## Publishing

Releases publish via GitHub Actions when a GitHub Release is published (or `workflow_dispatch`). Set repository secret `NPM_TOKEN`.

## License

MIT
