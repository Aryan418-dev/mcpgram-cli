import chalk from "chalk";
import open from "open";
import { APP_URL } from "../lib/constants.js";
import { loadConfig } from "../lib/config.js";
import { McpgramClient } from "../api/client.js";
import { fail, info, success, warn } from "../utils/ui.js";

/**
 * Connected apps (GitHub, Slack, Notion, …) are managed via dashboard OAuth.
 * CLI surfaces status + deep-links; connection flow stays on the web (secure secrets).
 *
 * TODO: GET/POST /api/v1/connectors when exposed for headless use.
 */
export async function appListCmd(): Promise<void> {
  const client = new McpgramClient();
  const apps = await client.listApps();
  console.log(chalk.bold("\nConnected apps\n"));
  if (!apps.length) {
    info("No dedicated apps API yet. Manage connectors in the dashboard.");
    const ws = loadConfig().workspaceId;
    const url = ws
      ? `${APP_URL}/dashboard/workspaces/${ws}/manage`
      : `${APP_URL}/dashboard`;
    console.log(chalk.cyan(`  ${url}`));
    return;
  }
  for (const a of apps) {
    console.log(`  ${a.name.padEnd(20)} ${a.status ?? "—"}  ${a.id}`);
  }
}

export async function appConnectCmd(provider?: string): Promise<void> {
  const ws = loadConfig().workspaceId;
  const base = ws
    ? `${APP_URL}/dashboard/workspaces/${ws}/manage`
    : `${APP_URL}/dashboard`;
  const url = provider ? `${base}?connect=${encodeURIComponent(provider)}` : base;
  info(`Opening connect flow for ${provider || "apps"}…`);
  console.log(chalk.cyan(url));
  try {
    await open(url);
    success("Browser opened. Complete OAuth in the dashboard.");
  } catch {
    warn("Could not open browser. Visit the URL above.");
  }
}

export async function appDisconnectCmd(provider?: string): Promise<void> {
  if (!provider) {
    fail("Usage: mcpgram app disconnect <provider>");
    process.exitCode = 1;
    return;
  }
  info(`Disconnect ${provider} from the dashboard manage page (API not exposed yet).`);
  await appConnectCmd(provider);
}
