# MCPGRAM CLI → Composio parity roadmap

Goal: match Composio’s **CLI-agent** experience (search / link / execute + agent skills) while keeping MCPGRAM’s **MCP-first** path for Cursor / Desktop / OpenCode.

## Phase 1 — Shell surface + skills (v0.4.0) ✅ in progress

| Item | Status |
|------|--------|
| `mcpgram search <query>` ranked NL search + plan | Done |
| `mcpgram execute <tool>` with `--schema` / `--dry-run` | Done |
| `mcpgram link [app]` / `unlink` (dashboard OAuth) | Done |
| `mcpgram install-skill` + auto on `setup` | Done |
| Skill markdown for Claude Code / Codex | Done |
| `setup --target auto\|claude\|codex` | Done |
| Version bump 0.4.0 | Done |

## Phase 2 — Richer execute & connect (v0.4.x)

- [ ] Headless connector list when `GET /api/v1/connectors` exists
- [ ] `mcpgram link` wait/poll until connection healthy
- [ ] `execute` JSON Schema validation before POST
- [ ] Parallel execute batch
- [ ] Mask secrets in CLI output

## Phase 3 — Agent plugins (native)

- [ ] Official Claude Code plugin marketplace package
- [ ] Codex plugin marketplace entry
- [ ] `mcpgram setup` installs plugin when plugin CLIs present

## Phase 4 — Scripted workflows

- [ ] `mcpgram run-script` multi-step TS (Composio `composio run`)
- [ ] Injected helpers: search(), execute(), link()

## Phase 5 — Product polish

- [ ] `mcpgram upgrade` self-update
- [ ] Better doctor
- [ ] Docs + npm publish 0.4.0

## Design rule

**Dual surface:** MCP path (setup writes MCP server) + CLI path (skills teach search/link/execute). Never drop MCP; add shell parity on top.
