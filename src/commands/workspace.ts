import chalk from "chalk";
import { McpgramClient } from "../api/client.js";
import { loadConfig, saveConfig } from "../lib/config.js";
import { fail, success, warn } from "../utils/ui.js";

/**
 * Workspaces are API-key scoped today (one workspace per key).
 * TODO: GET /api/v1/workspaces when user-level OAuth tokens list multiple workspaces.
 */
export async function workspaceListCmd(): Promise<void> {
  const client = new McpgramClient();
  const list = await client.listWorkspaces();
  const cfg = loadConfig();
  console.log(chalk.bold("\nWorkspaces\n"));
  if (!list.length) {
    warn("No workspace resolved. Re-run mcpgram login.");
    process.exitCode = 1;
    return;
  }
  for (const w of list) {
    const current =
      w.id === (cfg.defaultWorkspaceId || cfg.workspaceId) ? chalk.green(" (current)") : "";
    console.log(`  ${w.name || w.id}${current}`);
    console.log(chalk.dim(`    ${w.id}`));
  }
}

export async function workspaceSwitchCmd(workspaceId: string): Promise<void> {
  if (!workspaceId) {
    fail("Usage: mcpgram workspace switch <workspaceId>");
    process.exitCode = 1;
    return;
  }
  const cfg = loadConfig();
  if (cfg.apiKey && cfg.workspaceId && cfg.workspaceId !== workspaceId) {
    warn(
      "API keys are workspace-scoped. Switch by logging in with a key from the target workspace."
    );
    warn("Run: mcpgram login --key <other-workspace-key>");
    process.exitCode = 1;
    return;
  }
  saveConfig({ defaultWorkspaceId: workspaceId, workspaceId });
  success(`Default workspace set to ${workspaceId}`);
}
