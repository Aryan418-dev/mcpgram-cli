/**
 * Composio-style CLI login:
 * 1. POST /api/cli/session → login_url + key
 * 2. Open hosted page (any device)
 * 3. Poll until ready → receive workspace API key
 * 4. Store key — full dashboard + MCP features work
 */

import open from "open";
import chalk from "chalk";
import { APP_URL } from "../lib/constants.js";

export type SessionLoginResult = {
  apiKey: string;
  workspaceId?: string;
  workspaceName?: string;
  email?: string;
};

export async function sessionLogin(opts: {
  openBrowser?: boolean;
  timeoutMs?: number;
}): Promise<SessionLoginResult> {
  const base = APP_URL.replace(/\/$/, "");
  const createRes = await fetch(`${base}/api/cli/session`, {
    method: "POST",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  const created = (await createRes.json()) as {
    key?: string;
    login_url?: string;
    error?: string;
    hint?: string;
  };
  if (!createRes.ok || !created.key || !created.login_url) {
    throw new Error(
      created.error ||
        created.hint ||
        `Failed to create login session (${createRes.status})`
    );
  }

  console.log("");
  console.log(chalk.bold("  MCPGRAM login"));
  console.log(chalk.dim("  Open the link, sign in, authorize a workspace."));
  console.log("");
  console.log(`  ${chalk.cyan(created.login_url)}`);
  console.log("");

  if (opts.openBrowser !== false) {
    try {
      await open(created.login_url);
    } catch {
      console.log(chalk.yellow("  Open the URL above in your browser."));
    }
  }

  const timeout = opts.timeoutMs ?? 15 * 60 * 1000;
  const started = Date.now();
  let delay = 1500;

  while (Date.now() - started < timeout) {
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay + 250, 3000);

    const pollRes = await fetch(
      `${base}/api/cli/session?key=${encodeURIComponent(created.key)}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      }
    );
    const poll = (await pollRes.json()) as {
      status?: string;
      api_key?: string | null;
      workspace_id?: string;
      workspace_name?: string;
      email?: string;
      error?: string;
    };

    if (poll.status === "expired") {
      throw new Error("Login session expired. Run mcpgram login again.");
    }
    if (poll.status === "ready") {
      if (!poll.api_key) {
        throw new Error(
          "Session ready but API key already claimed. Run mcpgram login again."
        );
      }
      return {
        apiKey: poll.api_key,
        workspaceId: poll.workspace_id,
        workspaceName: poll.workspace_name,
        email: poll.email,
      };
    }
  }

  throw new Error("Login timed out. Run mcpgram login again.");
}
