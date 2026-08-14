import { McpgramClient } from "../api/client.js";
import { APP_URL } from "../lib/constants.js";
import { isJson, printJson, printHuman } from "../lib/output.js";
import { info, warn } from "../utils/ui.js";

/**
 * Tool call logs live in tool_calls; Activity API is session-cookie oriented.
 * CLI authenticates with Bearer and points users to the dashboard.
 */
export async function logsListCmd(opts: {
  limit?: string;
  server?: string;
} = {}): Promise<void> {
  const client = new McpgramClient();
  const me = await client.me();
  const payload = {
    ok: true,
    workspace_id: me.workspaceId,
    source: "dashboard",
    filters: opts,
    message:
      "Full tool-call logs require the dashboard Activity UI. Request a Bearer-auth logs endpoint for CLI streaming.",
    url: me.workspaceId
      ? `${APP_URL}/dashboard?workspace=${me.workspaceId}`
      : `${APP_URL}/dashboard`,
  };
  if (isJson()) {
    printJson(payload);
    return;
  }
  warn(payload.message);
  info(payload.url);
}

export async function logsGetCmd(id: string): Promise<void> {
  const payload = {
    ok: true,
    id,
    message: "Open the dashboard Activity / Observability view for execution traces.",
    url: `${APP_URL}/dashboard/observability`,
  };
  if (isJson()) {
    printJson(payload);
    return;
  }
  printHuman(payload.message);
  info(payload.url);
}
