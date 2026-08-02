import readline from "node:readline";
import chalk from "chalk";
import open from "open";
import { APP_URL } from "../lib/constants.js";
import { loadConfig, saveConfig, getMcpUrl } from "../lib/config.js";
import { McpgramClient } from "../api/client.js";
import { browserPkceLogin } from "../auth/browser.js";
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

/**
 * mcpgram login
 * 1. Prefer browser Authorization Code + PKCE (unified account)
 * 2. Fall back to API key for CI / when OAuth unavailable
 */
export async function loginCmd(opts: {
  key?: string;
  open?: boolean;
  browser?: boolean;
} = {}): Promise<void> {
  heading("MCPGRAM Login");

  if (opts.key || process.env.MCPGRAM_API_KEY) {
    await loginWithApiKey(opts.key || process.env.MCPGRAM_API_KEY!);
    return;
  }

  if (opts.browser !== false) {
    const spin = spinner("Starting browser login (PKCE)…");
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
      const client = new McpgramClient(tokens.accessToken);
      const v = await client.validateKey();
      if (v.ok && v.workspaceId) {
        saveConfig({ workspaceId: v.workspaceId, defaultWorkspaceId: v.workspaceId });
      }
      success("Logged into MCPGRAM");
      if (v.workspaceId) success(`Workspace: ${v.workspaceId}`);
      console.log(chalk.dim("\nNext: mcpgram setup --all   or   mcpgram onboard"));
      return;
    } catch (e) {
      spin.stop();
      warn(`Browser login unavailable: ${e instanceof Error ? e.message : e}`);
      info("Falling back to API key…");
    }
  }

  const keysUrl = `${APP_URL}/dashboard`;
  console.log("1. Open the dashboard and copy a workspace API key.");
  console.log(`   ${chalk.cyan(keysUrl)}`);
  console.log("2. Paste the API key below.\n");
  if (opts.open !== false) {
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
  success("Logged into MCPGRAM");
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
  if (!v.ok) {
    fail(`Auth failed: ${v.error}`);
    process.exitCode = 1;
    return;
  }
  console.log(chalk.bold("MCPGRAM session"));
  if (cfg.email) console.log(`  User:      ${cfg.email}`);
  console.log(`  Workspace: ${v.workspaceId ?? cfg.workspaceId ?? "—"}`);
  if (cfg.workspaceName) console.log(`  Name:      ${cfg.workspaceName}`);
  console.log(`  Credential: ${maskSecret(token)}`);
  console.log(`  Type:       ${cfg.apiKey ? "API key" : "OAuth token"}`);
  console.log(`  MCP URL:    ${getMcpUrl()}`);
}
