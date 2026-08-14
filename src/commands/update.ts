/**
 * mcpgram update | upgrade — self-update to latest @mcpgram/cli.
 */

import { spawn } from "node:child_process";
import chalk from "chalk";
import { CLI_VERSION } from "../lib/constants.js";
import { isJson, printJson } from "../lib/output.js";
import { success, fail, info } from "../utils/ui.js";

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch("https://registry.npmjs.org/@mcpgram/cli/latest", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

function spawnAsync(cmd: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

export async function updateCmd(opts: { check?: boolean; yes?: boolean } = {}): Promise<void> {
  const latest = await fetchLatestVersion();

  if (isJson()) {
    printJson({
      current: CLI_VERSION,
      latest: latest ?? null,
      upToDate: latest ? latest === CLI_VERSION : null,
    });
    if (opts.check) return;
  } else {
    if (latest) {
      if (latest === CLI_VERSION) {
        success(`Already on latest version ${CLI_VERSION}`);
        if (opts.check) return;
        if (!opts.yes) {
          info("Reinstalling to ensure a clean install…");
        }
      } else {
        info(`Update available: ${CLI_VERSION} → ${latest}`);
      }
    } else {
      info(`Current version: ${CLI_VERSION} (could not reach npm registry)`);
    }
  }

  if (opts.check) {
    if (!isJson() && latest && latest !== CLI_VERSION) {
      console.log(chalk.dim(`Run: mcpgram upgrade`));
      process.exitCode = 2;
    }
    return;
  }

  if (!isJson()) info("Updating MCPGRAM CLI…");

  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const npmCode = await spawnAsync(npmCmd, ["install", "-g", "@mcpgram/cli@latest"]);
  if (npmCode === 0) {
    const after = (await fetchLatestVersion()) ?? "latest";
    success(`Updated to @mcpgram/cli@${after}`);
    if (!isJson()) console.log(chalk.dim("Restart open agent terminals to pick up the new binary."));
    return;
  }

  if (!isJson()) console.log(chalk.dim("npm update failed; trying install script…"));
  const base = process.env.MCPGRAM_INSTALL_BASE || "https://mcpgram.vercel.app";
  const scriptCode = await spawnAsync("bash", ["-c", `curl -fsSL ${base}/install | bash`]);
  if (scriptCode === 0) {
    success("Updated via install script");
    return;
  }

  fail("Update failed. Try: npm install -g @mcpgram/cli@latest");
  process.exitCode = 1;
}
