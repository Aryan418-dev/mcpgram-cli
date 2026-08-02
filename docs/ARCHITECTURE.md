# MCPGRAM CLI Architecture

## Diagram

```
┌──────────────────┐     HTTPS Bearer      ┌─────────────────────────────┐
│  mcpgram CLI     │ ───────────────────►  │  mcpgram-dashboard          │
│  (Node 18+)      │   /api/v1/tools       │  (workspaces, api_keys,     │
│                  │   /api/v1/execute     │   mcp_servers, tools)       │
│  ~/.mcpgram/     │   /api/v1/mcp-servers └──────────────┬──────────────┘
│  config.json     │                                      │
└────────┬─────────┘                                      ▼
         │                                    ┌───────────────────────────┐
         │ writes MCP configs                 │  mcpgram-mcp-server       │
         ▼                                    │  POST /mcp  (OAuth + key) │
┌────────────────────────────┐                │  Universal meta-tools     │
│ Agent providers (plugins)  │                └───────────────────────────┘
│  claude-code, cursor, …    │
│  each implements:          │
│   detect / setup / repair  │
└────────────────────────────┘
```

## Folder structure

See `src/` — commands, providers, auth (PKCE), api client.

## APIs reused

| Endpoint | Used by |
|----------|---------|
| `GET /api/v1/tools` | tools list/search/info, doctor |
| `POST /api/v1/execute` | (reserved) tool run |
| `GET /api/v1/mcp-servers` | mcp list, doctor |
| `POST /api/v1/mcp-servers` | mcp add |
| `DELETE /api/v1/mcp-servers/:id` | mcp remove |
| `POST /api/v1/mcp-servers/:id` | mcp refresh, sync |

Auth: `Authorization: Bearer <workspace api_key or OAuth token>`.

## New APIs recommended (not required for v0.2)

1. `GET /api/v1/me` — whoami
2. `GET /api/v1/workspaces` — multi-workspace switch
3. `GET /api/v1/connectors` — app list for CLI
