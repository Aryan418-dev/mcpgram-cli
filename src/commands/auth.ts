import readline from "node:readline";
import chalk from "chalk";
import open from "open";
import { APP_URL } from "../lib/constants.js";
import { loadConfig, saveConfig, getMcpUrl } from "../lib/config.js";
import { McpgramClient } from "../api/client.js";
import { browserPkceLogin } from "../auth/browser.js";
import { sessionLogin } from "../auth/session-login.js";
import {
  clearCredentials,
  getBearerToken,
  maskSecret,
  storeCredentials,
} from "../auth/token.js";
import { fail, heading, info, success, warn, spinner } from "../utils/ui.js";

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/** mcpgram login — browser PKCE is the default and first option. */
export async function loginCmd(opts: {
  key?: string;
  open?: boolean;
  browser?: boolean;
} = {}): Promise<void> {
  heading("MCPGRAM Login");

  if (opts.key) {
    await loginWithApiKey(opts.key);
    return;
  }
  if (opts.browser === false) {
    const envKey = process.env.MCPGRAM_API_KEY?.trim();
    if (envKey) {
      await loginWithApiKey(envKey);
      return;
    }
    await promptApiKeyFlow(opts.open !== false);
    return;
  }

  info("Using browser sign-in (Authorization Code + PKCE)");
  const spin = spinner("Preparing secure login…");
  try {
    const tokens = await browserPkceLogin({ openBrowser: opts.open !== false });
    spin.stop();
    const expiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
      : undefined;
    storeCredentials({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: tokens.tokenType,
      expiresAt,
      apiKey: undefined,
    });

    let workspaceId: string | undefined;
    try {
      const client = new McpgramClient(tokens.accessToken);
      const v = await client.validateKey();
      if (v.ok && v.workspaceId) {
        workspaceId = v.workspaceId;
        saveConfig({ workspaceId, defaultWorkspaceId: workspaceId });
      }
    } catch {
      /* OAuth session still saved for MCP */
    }

    success("Logged into MCPGRAM (browser PKCE)");
    if (workspaceId) success(`Workspace: ${workspaceId}`);
    else {
      info(
        "Session saved for MCP agents. For dashboard API: mcpgram login --key <workspace_key>"
      );
    }
    console.log(chalk.dim("\nNext: mcpgram setup --all   or   mcpgram onboard"));
  } catch (e) {
    spin.stop();
    const msg = e instanceof Error ? e.message : String(e);
    fail(`Browser login failed: ${msg}`);
    console.log("");
    warn("Fallbacks:");
    console.log(chalk.dim("  mcpgram login --key <workspace_api_key>"));
    console.log(chalk.dim("  mcpgram login --no-browser"));
    console.log("");
    if (process.stdin.isTTY) {
      const useKey = await prompt("Try API key login instead? [y/N] ");
      if (useKey.toLowerCase() === "y" || useKey.toLowerCase() === "yes") {
        await promptApiKeyFlow(opts.open !== false);
        return;
      }
    }
    process.exitCode = 1;
  }
}

async function promptApiKeyFlow(openBrowser: boolean): Promise<void> {
  const keysUrl = `${APP_URL}/dashboard`;
  console.log("1. Open the dashboard and copy a workspace API key.");
  console.log(`   ${chalk.cyan(keysUrl)}`);
  console.log("2. Paste the API key below.\n");
  if (openBrowser) {
    try {
      await open(keysUrl);
      console.log(chalk.dim("Opened browser.\n"));
    } catch {
      /* ignore */
    }
  }
  const apiKey = await prompt("API key: ");
  if (!apiKey) {
    fail("No API key provided.");
    process.exitCode = 1;
    return;
  }
  await loginWithApiKey(apiKey);
}

async function loginWithApiKey(apiKey: string): Promise<void> {
  storeCredentials({ apiKey, accessToken: undefined });
  const client = new McpgramClient(apiKey);
  const v = await client.validateKey();
  if (!v.ok) {
    clearCredentials();
    fail(`Invalid credentials: ${v.error}`);
    process.exitCode = 1;
    return;
  }
  saveConfig({
    apiKey,
    workspaceId: v.workspaceId,
    defaultWorkspaceId: v.workspaceId,
  });
  success("Logged into MCPGRAM (API key)");
  if (v.workspaceId) success(`Workspace: ${v.workspaceId}`);
  console.log(chalk.dim("\nNext: mcpgram setup --all"));
}

export async function logoutCmd(): Promise<void> {
  clearCredentials();
  success("Logged out. Local credentials removed.");
}

export async function whoamiCmd(): Promise<void> {
  const token = getBearerToken();
  const cfg = loadConfig();
  if (!token) {
    warn("Not logged in. Run `mcpgram login`.");
    process.exitCode = 1;
    return;
  }
  const client = new McpgramClient();
  const v = await client.validateKey();
  console.log(chalk.bold("MCPGRAM session"));
  if (cfg.email) console.log(`  User:      ${cfg.email}`);
  console.log(`  Workspace: ${v.workspaceId ?? cfg.workspaceId ?? "—"}`);
  if (cfg.workspaceName) console.log(`  Name:      ${cfg.workspaceName}`);
  console.log(`  Credential: ${maskSecret(token)}`);
  console.log(`  Type:       ${cfg.apiKey ? "API key" : "OAuth token (PKCE)"}`);
  console.log(`  MCP URL:    ${getMcpUrl()}`);
  if (!v.ok) {
    warn(`API check: ${v.error}`);
  }
}
