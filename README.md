# MCPGRAM CLI

Official command-line companion for [MCPGRAM](https://mcpgram.vercel.app).

**Install once → login once → configure every AI agent automatically.**

## Install

```bash
curl -fsSL https://mcpgram.vercel.app/install | bash
```

macOS / Linux:

```bash
curl -fsSL https://install.mcpgram.com | bash
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
mcpgram login
mcpgram scan
mcpgram setup --all
mcpgram doctor
```

Or: `mcpgram onboard`

## Commands

| Command | Description |
|--------|-------------|
| `mcpgram login` | Sign in |
| `mcpgram logout` | Sign out |
| `mcpgram whoami` | Show session |
| `mcpgram onboard` | Login + scan + setup + doctor |
| `mcpgram scan` | Detect agents |
| `mcpgram setup --all` | Configure detected agents |
| `mcpgram doctor` | Health checks |
| `mcpgram update` | Update CLI |
| `mcpgram mcp list` | List MCP servers |
| `mcpgram tools` | List tools |

## License

MIT
