/**
 * mcpgram link [app] — Composio-style connect alias.
 */

import chalk from "chalk";
import open from "open";
import { APP_URL } from "../lib/constants.js";
import { loadConfig } from "../lib/config.js";
import { isJson, printJson } from "../lib/output.js";
import { info, success, warn } from "../utils/ui.js";

const KNOWN_APPS = [
  "github", "slack", "notion", "linkedin", "discord", "figma",
  "gmail", "google", "linear", "hubspot", "jira", "gitlab", "twitter", "x",
];

export async function linkCmd(app?: string): Promise<void> {
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
    console.log(chalk.dim(`\nManage page: ${base}`));
    return;
  }

  const provider = app.toLowerCase().trim();
  const url = `${base}?connect=${encodeURIComponent(provider)}`;

  if (isJson()) {
    printJson({ app: provider, url, action: "open_browser_oauth" });
    return;
  }

  info(`Linking ${provider}…`);
  console.log(chalk.cyan(url));
  try {
    await open(url);
    success("Browser opened. Complete OAuth, then retry your tool.");
    console.log(chalk.dim("Tip: mcpgram search \"" + provider + "\"  after connecting"));
  } catch {
    warn("Could not open browser. Visit the URL above.");
  }
}

export async function unlinkCmd(app?: string): Promise<void> {
  if (!app) {
    console.log("Usage: mcpgram unlink <app>");
    process.exitCode = 1;
    return;
  }
  await linkCmd(app);
}
