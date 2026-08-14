# MCPGRAM CLI → Composio parity roadmap

Goal: match Composio’s **CLI-agent** experience (search / link / execute + agent skills/plugins) while keeping MCPGRAM’s **MCP-first** path for Cursor / Desktop / OpenCode.

## Phase 1 — Shell surface + skills (v0.4.0) ✅

| Item | Status |
|------|--------|
| `mcpgram search <query>` ranked NL search + plan | Done |
| `mcpgram execute <tool>` with `--schema` / `--dry-run` | Done |
| `mcpgram link [app]` / `unlink` (dashboard OAuth) | Done |
| `mcpgram install-skill` + auto on `setup` | Done |
| Skill markdown for Claude Code / Codex | Done |
| `setup --target auto\|claude\|codex` | Done |
| Version bump 0.4.0 | Done |

## Phase 2 — Richer execute & connect (v0.4.x) ✅

| Item | Status |
|------|--------|
| Headless connector list (`listApps` multi-path probe) | Done |
| `mcpgram link --wait` / `--timeout` poll until tools appear | Done |
| JSON Schema validation before execute | Done |
| `mcpgram execute --batch file.json` (+ `--sequential`) | Done |
| Mask secrets in CLI / JSON output (`redactDeep`) | Done |
| Doctor checks Claude skill install path | Done |

## Phase 3 — Agent plugins (native) ✅

| Item | Status |
|------|--------|
| Official Claude Code plugin package (`plugins/claude-code/`) | Done |
| Marketplace manifest + `plugin.json` | Done |
| SessionStart + UserPromptSubmit hooks | Done |
| `/mcpgram-connect <app>` slash command | Done |
| Codex skill package (`plugins/codex/`) | Done |
| `mcpgram setup` installs local Claude plugin + skills | Done |
| Package ships `plugins/` on npm | Done |

### Install (Claude Code)

```bash
mcpgram setup --target claude
# or inside Claude Code:
/plugin marketplace add Aryan418-dev/mcpgram-cli
/plugin install mcpgram@mcpgram
```

Local path after setup: `~/.claude/plugins/local/mcpgram`

### Install (Codex)

```bash
mcpgram setup --target codex
# skill → ~/.codex/skills/mcpgram-cli/SKILL.md
```

## Phase 4 — Scripted workflows ✅

| Item | Status |
|------|--------|
| `mcpgram run-script <file>` (+ alias `script`) | Done |
| Injected helpers: search / execute / link / tools / sleep / log | Done |
| .mjs/.js direct import + .ts via npx tsx | Done |
| Example `examples/hello-workflow.mjs` | Done |

```bash
mcpgram run-script examples/hello-workflow.mjs
mcpgram script my-flow.ts --dry-run
```

## Phase 5 — Product polish

- [ ] `mcpgram upgrade` self-update
- [ ] Stronger doctor (MCP ping)
- [ ] Docs + **npm publish 0.4.0** (includes Phase 1–4)

## Design rule

**Dual surface:** MCP path (setup writes MCP server) + CLI path (skills + plugins teach search/link/execute). Never drop MCP; add shell parity on top.
