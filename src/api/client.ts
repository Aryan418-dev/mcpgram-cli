import { getApiBase, requireApiKey } from "../lib/config.js";
import { USER_AGENT } from "../lib/constants.js";
import { getBearerToken } from "../auth/token.js";
import { CliError, ExitCode } from "../lib/errors.js";

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

export type ToolRow = {
  tool_id: string;
  name: string;
  description?: string | null;
  input_schema?: unknown;
};

export type ToolsListResponse = {
  servers: Array<{
    server_id: string;
    name: string;
    status: string;
    tools: ToolRow[];
  }>;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  role?: string;
};

export type ExecuteResult = {
  status?: string;
  output?: unknown;
  error?: string;
  request_id?: string;
  trace_id?: string;
  execution_id?: string;
  duration_ms?: number;
  meta?: Record<string, unknown>;
};

/**
 * Dashboard /api/v1 client.
 * Auth: Bearer workspace API key or OAuth access token.
 */
export class McpgramClient {
  constructor(
    private readonly token = getBearerToken() || requireApiKey(),
    private readonly baseUrl = getApiBase()
  ) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts?: { timeoutMs?: number }
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 30_000);
    try {
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
        signal: controller.signal,
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
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (e instanceof Error && e.name === "AbortError") {
        throw new CliError("Request timed out", ExitCode.NETWORK, `URL: ${url}`);
      }
      throw new CliError(
        e instanceof Error ? e.message : String(e),
        ExitCode.NETWORK,
        `Check ${this.baseUrl}`
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  listTools(serverFilter?: string): Promise<ToolsListResponse> {
    const qs = serverFilter ? `?server=${encodeURIComponent(serverFilter)}` : "";
    return this.request("GET", `/api/v1/tools${qs}`);
  }

  listMcpServers(): Promise<{ workspace_id: string; servers: McpServerRow[] }> {
    return this.request("GET", "/api/v1/mcp-servers");
  }

  getMcpServer(serverId: string): Promise<McpServerRow | Record<string, unknown>> {
    return this.request("GET", `/api/v1/mcp-servers/${encodeURIComponent(serverId)}`);
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

  execute(toolId: string, input?: Record<string, unknown>): Promise<ExecuteResult> {
    return this.request("POST", "/api/v1/execute", {
      tool_id: toolId,
      input: input ?? {},
    });
  }

  async findTool(nameOrId: string): Promise<{ tool: ToolRow; server: string } | null> {
    const data = await this.listTools();
    const q = nameOrId.toLowerCase();
    for (const s of data.servers) {
      for (const t of s.tools) {
        if (
          t.tool_id === nameOrId ||
          t.name === nameOrId ||
          t.name.toLowerCase() === q ||
          t.tool_id.toLowerCase() === q
        ) {
          return { tool: t, server: s.name };
        }
      }
    }
    return null;
  }

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

  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    const me = await this.me();
    if (!me.ok || !me.workspaceId) return [];
    return [{ id: me.workspaceId, name: me.workspaceId }];
  }

  /** Best-effort connector list. Tries several dashboard paths; returns [] if none exist. */
  async listApps(): Promise<Array<{ id: string; name: string; status?: string }>> {
    const paths = ["/api/v1/connectors", "/api/v1/apps", "/api/v1/connections"];
    for (const path of paths) {
      try {
        const data = await this.request<unknown>("GET", path);
        const rows = Array.isArray(data)
          ? data
          : (data as { connectors?: unknown[] })?.connectors ??
            (data as { apps?: unknown[] })?.apps ??
            (data as { connections?: unknown[] })?.connections ??
            [];
        if (!Array.isArray(rows)) continue;
        return rows.map((r, i) => {
          const row = r as Record<string, unknown>;
          return {
            id: String(row.id ?? row.provider ?? row.name ?? i),
            name: String(row.name ?? row.provider ?? row.id ?? "app"),
            status: row.status != null ? String(row.status) : undefined,
          };
        });
      } catch {
        /* try next */
      }
    }
    return [];
  }
}
