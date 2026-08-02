import { getApiBase, requireApiKey } from "../lib/config.js";
import { USER_AGENT } from "../lib/constants.js";
import { getBearerToken } from "../auth/token.js";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type McpServerRow = {
  server_id: string;
  name: string;
  url: string;
  auth_type?: string;
  status: string;
  last_checked_at?: string | null;
  last_error?: string | null;
  tool_count: number;
  provider_type?: string;
};

export type ToolsListResponse = {
  servers: Array<{
    server_id: string;
    name: string;
    status: string;
    tools: Array<{
      tool_id: string;
      name: string;
      description?: string | null;
      input_schema?: unknown;
    }>;
  }>;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  role?: string;
};

/**
 * Dashboard /api/v1 client.
 * Auth: Bearer workspace API key or OAuth access token (same identity system).
 */
export class McpgramClient {
  constructor(
    private readonly token = getBearerToken() || requireApiKey(),
    private readonly baseUrl = getApiBase()
  ) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-MCPGRAM-Agent": "mcpgram-cli",
        "User-Agent": USER_AGENT,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
    }
    if (!res.ok) {
      const msg =
        (json as { error?: string } | null)?.error ?? `HTTP ${res.status}`;
      throw new ApiError(msg, res.status, json);
    }
    return json as T;
  }

  listTools(serverFilter?: string): Promise<ToolsListResponse> {
    const qs = serverFilter ? `?server=${encodeURIComponent(serverFilter)}` : "";
    return this.request("GET", `/api/v1/tools${qs}`);
  }

  listMcpServers(): Promise<{ workspace_id: string; servers: McpServerRow[] }> {
    return this.request("GET", "/api/v1/mcp-servers");
  }

  connectMcpServer(body: {
    url: string;
    name?: string;
    authentication?: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    return this.request("POST", "/api/v1/mcp-servers", body);
  }

  disconnectMcpServer(serverId: string): Promise<Record<string, unknown>> {
    return this.request("DELETE", `/api/v1/mcp-servers/${encodeURIComponent(serverId)}`);
  }

  refreshMcpServer(serverId: string): Promise<Record<string, unknown>> {
    return this.request("POST", `/api/v1/mcp-servers/${encodeURIComponent(serverId)}`);
  }

  execute(tool: string, arguments_?: Record<string, unknown>): Promise<unknown> {
    return this.request("POST", "/api/v1/execute", {
      tool,
      arguments: arguments_ ?? {},
    });
  }

  /**
   * TODO: GET /api/v1/me — dedicated whoami.
   * Today we infer workspace from mcp-servers list.
   */
  async me(): Promise<{ workspaceId?: string; ok: boolean; error?: string }> {
    try {
      const data = await this.listMcpServers();
      return { ok: true, workspaceId: data.workspace_id };
    } catch (e) {
      if (e instanceof ApiError) return { ok: false, error: e.message };
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async validateKey(): Promise<{ ok: boolean; workspaceId?: string; error?: string }> {
    return this.me();
  }

  /**
   * TODO: GET /api/v1/workspaces for multi-workspace listing under user tokens.
   * API keys are workspace-scoped so list is implicit.
   */
  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    const me = await this.me();
    if (!me.ok || !me.workspaceId) return [];
    return [{ id: me.workspaceId, name: me.workspaceId }];
  }

  /**
   * TODO: connector/apps list endpoint for `mcpgram app list`.
   * Until then, surface MCP servers as the operational surface.
   */
  async listApps(): Promise<Array<{ id: string; name: string; status?: string }>> {
    return [];
  }
}
