/**
 * mcpgram link [app] — Composio-style connect + optional --wait poll.
 */

import chalk from "chalk";
import open from "open";
import { APP_URL } from "../lib/constants.js";
import { loadConfig } from "../lib/config.js";
import { isJson, printJson, printHuman } from "../lib/output.js";
import { McpgramClient } from "../api/client.js";
import { info, success, warn } from "../utils/ui.js";

const KNOWN_APPS = [
  "github", "slack", "notion", "linkedin", "discord", "figma",
  "gmail", "google", "linear", "hubspot", "jira", "gitlab", "twitter", "x",
];

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function isAppLikelyConnected(app: string): Promise<{ connected: boolean; detail: string }> {
  const client = new McpgramClient();
  try {
    const apps = await client.listApps();
    if (apps.length) {
      const hit = apps.find(
        (a) => a.id.toLowerCase().includes(app) || a.name.toLowerCase().includes(app)
      );
      if (hit) {
        const st = (hit.status ?? "").toLowerCase();
        const ok = !st || ["connected", "active", "ok", "authorized"].includes(st);
        return { connected: ok, detail: `${hit.name} (${hit.status ?? "listed"})` };
      }
    }
  } catch {
    /* tools heuristic */
  }

  try {
    const tools = await client.listTools();
    const q = app.toLowerCase();
    const matches = tools.servers.flatMap((s) =>
      s.tools.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.tool_id.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q)
      )
    );
    if (matches.length) {
      return { connected: true, detail: `${matches.length} tools matching "${app}" visible` };
    }
    return { connected: false, detail: "no matching tools yet" };
  } catch (e) {
    return { connected: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

export async function linkCmd(
  app?: string,
  opts: { wait?: boolean; timeout?: string } = {}
): Promise<void> {
  const ws = loadConfig().workspaceId;
  const base = ws
    ? `${APP_URL}/dashboard/workspaces/${ws}/manage`
    : `${APP_URL}/dashboard`;

  if (!app) {
    if (isJson()) {
      printJson({ message: "Specify an app to link", examples: KNOWN_APPS.slice(0, 8), url: base });
      return;
    }
    console.log(chalk.bold("\nmcpgram link <app>\n"));
    console.log("Connect an app account via browser OAuth (dashboard).\n");
    console.log(chalk.bold("Examples:"));
    for (const a of KNOWN_APPS.slice(0, 10)) console.log(`  mcpgram link ${a}`);
    console.log(chalk.dim("\n  mcpgram link linkedin --wait"));
    console.log(chalk.dim(`\nManage page: ${base}`));
    return;
  }

  const provider = app.toLowerCase().trim();
  const url = `${base}?connect=${encodeURIComponent(provider)}`;

  if (isJson() && !opts.wait) {
    printJson({ app: provider, url, action: "open_browser_oauth" });
    return;
  }

  info(`Linking ${provider}\u2026`);
  console.log(chalk.cyan(url));
  try {
    await open(url);
    success("Browser opened. Complete OAuth in the dashboard.");
  } catch {
    warn("Could not open browser. Visit the URL above.");
  }

  if (!opts.wait) {
    console.log(chalk.dim(`Tip: mcpgram link ${provider} --wait`));
    console.log(chalk.dim(`     mcpgram search "${provider}"`));
    return;
  }

  const timeoutMs = Math.max(5_000, Math.min(600_000, Number(opts.timeout) || 120_000));
  const started = Date.now();
  printHuman(chalk.dim(`Waiting up to ${Math.round(timeoutMs / 1000)}s for ${provider}\u2026`));

  while (Date.now() - started < timeoutMs) {
    const status = await isAppLikelyConnected(provider);
    if (status.connected) {
      if (isJson()) {
        printJson({
          app: provider,
          connected: true,
          detail: status.detail,
          waited_ms: Date.now() - started,
        });
        return;
      }
      success(`Connected: ${status.detail}`);
      console.log(chalk.dim(`Next: mcpgram search "${provider}"`));
      return;
    }
    process.stdout.write(chalk.dim("."));
    await sleep(3000);
  }

  if (isJson()) {
    printJson({ app: provider, connected: false, timed_out: true, timeout_ms: timeoutMs });
    process.exitCode = 1;
    return;
  }
  console.log("");
  warn(`Timed out waiting for ${provider}. Finish OAuth, then: mcpgram search "${provider}"`);
  process.exitCode = 1;
}

export async function unlinkCmd(app?: string): Promise<void> {
  if (!app) {
    console.log("Usage: mcpgram unlink <app>");
    process.exitCode = 1;
    return;
  }
  await linkCmd(app);
}
