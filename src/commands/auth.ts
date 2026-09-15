import readline from "node:readline";
import chalk from "chalk";
import open from "open";
import { APP_URL } from "../lib/constants.js";
import { loadConfig, saveConfig, getMcpUrl } from "../lib/config.js";
import { McpgramClient } from "../api/client.js";
import { sessionLogin } from "../auth/session-login.js";
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
 * mcpgram login — Composio-style by default:
 * hosted browser page + poll → workspace API key → full feature access.
 */
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

  info("Open the link, sign in, authorize a workspace");
  const spin = spinner("Waiting for browser…");
  try {
    const session = await sessionLogin({ openBrowser: opts.open !== false });
    spin.stop();
    storeCredentials({
      apiKey: session.apiKey,
      accessToken: undefined,
      refreshToken: undefined,
    });
    saveConfig({
      apiKey: session.apiKey,
      workspaceId: session.workspaceId,
      defaultWorkspaceId: session.workspaceId,
      workspaceName: session.workspaceName,
      email: session.email,
    });
    success("Logged into MCPGRAM");
    if (session.email) success(`User: ${session.email}`);
    if (session.workspaceName || session.workspaceId) {
      success(`Workspace: ${session.workspaceName || session.workspaceId}`);
    }
    console.log(
      chalk.dim("\nYou're ready — mcpgram whoami · mcpgram tools · mcpgram setup --all")
    );
    return;
  } catch (e) {
    spin.stop();
    warn(`Hosted login failed: ${e instanceof Error ? e.message : e}`);
    info("Falling back to PKCE…");
    try {
      const tokens = await browserPkceLogin({ openBrowser: opts.open !== false });
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
      success("Logged into MCPGRAM (PKCE)");
      return;
    } catch (e2) {
      fail(`Login failed: ${e2 instanceof Error ? e2.message : e2}`);
      console.log(chalk.dim("  mcpgram login --key <workspace_api_key>"));
      process.exitCode = 1;
    }
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
  console.log(chalk.bold("MCPGRAM session"));
  if (cfg.email) console.log(`  User:      ${cfg.email}`);
  console.log(`  Workspace: ${v.workspaceId ?? cfg.workspaceId ?? "—"}`);
  if (cfg.workspaceName) console.log(`  Name:      ${cfg.workspaceName}`);
  console.log(`  Credential: ${maskSecret(token)}`);
  console.log(`  Type:       ${cfg.apiKey ? "API key" : "OAuth token"}`);
  console.log(`  MCP URL:    ${getMcpUrl()}`);
  if (!v.ok) {
    warn(`API check: ${v.error}`);
  }
}
