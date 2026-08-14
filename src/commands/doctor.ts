import chalk from "chalk";
import os from "node:os";
import { loadConfig, getMcpUrl, getApiBase, getConfigPath } from "../lib/config.js";
import { McpgramClient } from "../api/client.js";
import { providers } from "../providers/registry.js";
import { isAuthenticated } from "../auth/token.js";
import { CLI_VERSION } from "../lib/constants.js";
import { isJson, printJson } from "../lib/output.js";

type Check = { name: string; ok: boolean; detail: string; fix?: string };

export async function doctorCmd(): Promise<void> {
  const checks: Check[] = [];

  const major = Number(process.versions.node.split(".")[0]);
  checks.push({
    name: "Node.js",
    ok: major >= 18,
    detail: `v${process.versions.node}`,
    fix: major >= 18 ? undefined : "Upgrade to Node.js 18+",
  });

  checks.push({
    name: "Config path",
    ok: true,
    detail: getConfigPath(),
  });

  if (!isAuthenticated()) {
    checks.push({
      name: "Authentication",
      ok: false,
      detail: "No credentials",
      fix: "mcpgram login",
    });
  } else {
    try {
      const client = new McpgramClient();
      const v = await client.validateKey();
      checks.push({
        name: "Authentication",
        ok: v.ok,
        detail: v.ok ? `workspace ${v.workspaceId}` : v.error || "failed",
        fix: v.ok ? undefined : "mcpgram login",
      });
      if (v.ok) {
        const servers = await client.listMcpServers();
        const unhealthy = servers.servers.filter(
          (s) => s.status && !["verified", "healthy", "ok"].includes(String(s.status).toLowerCase())
        );
        checks.push({
          name: "MCP servers",
          ok: unhealthy.length === 0,
          detail: `${servers.servers.length} servers, ${unhealthy.length} unhealthy`,
          fix: unhealthy.length ? "mcpgram mcp list && mcpgram mcp refresh <id>" : undefined,
        });
        const tools = await client.listTools();
        const toolCount = tools.servers.reduce((n, s) => n + s.tools.length, 0);
        checks.push({
          name: "Tool discovery",
          ok: toolCount > 0,
          detail: `${toolCount} tools across ${tools.servers.length} servers`,
          fix: toolCount ? undefined : "Connect apps or MCP servers in the dashboard",
        });
      }
    } catch (e) {
      checks.push({
        name: "API connectivity",
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
        fix: `Check network / ${getApiBase()}`,
      });
    }
  }

  try {
    const url = new URL(getMcpUrl());
    checks.push({
      name: "MCP URL",
      ok: url.protocol === "https:" || url.hostname === "localhost",
      detail: getMcpUrl(),
    });
  } catch {
    checks.push({ name: "MCP URL", ok: false, detail: "Invalid URL", fix: "Set MCPGRAM_MCP_URL" });
  }

  try {
    const res = await fetch(getApiBase(), { method: "HEAD", signal: AbortSignal.timeout(8000) });
    checks.push({
      name: "Dashboard reachability",
      ok: res.status < 500,
      detail: `${getApiBase()} → ${res.status}`,
      fix: res.status >= 500 ? "Dashboard may be down" : undefined,
    });
  } catch (e) {
    checks.push({
      name: "Dashboard reachability",
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
      fix: `Check ${getApiBase()}`,
    });
  }

  let configured = 0;
  let detected = 0;
  for (const p of providers) {
    const d = await p.detect();
    if (d.installed) detected++;
    const s = await p.readStatus();
    if (s.configured) configured++;
  }
  checks.push({
    name: "Agent detection",
    ok: detected > 0,
    detail: `${detected} agents detected on ${os.platform()}`,
    fix: detected ? undefined : "Install Claude Code, Cursor, or another supported agent",
  });
  checks.push({
    name: "Agent configs",
    ok: configured > 0,
    detail: `${configured} agents configured`,
    fix: configured ? undefined : "mcpgram setup --all",
  });

  const failed = checks.filter((c) => !c.ok).length;

  if (isJson()) {
    printJson({
      ok: failed === 0,
      version: CLI_VERSION,
      checks,
      failed,
    });
    if (failed) process.exitCode = 1;
    return;
  }

  console.log(chalk.bold(`\nMCPGRAM doctor  (cli ${CLI_VERSION})\n`));
  for (const c of checks) {
    const mark = c.ok ? chalk.green("✓") : chalk.red("✗");
    console.log(`${mark} ${c.name}: ${c.detail}`);
    if (!c.ok && c.fix) console.log(chalk.dim(`    → ${c.fix}`));
  }
  console.log("");
  if (failed) {
    console.log(chalk.yellow(`${failed} issue(s). Suggested fixes are listed above.`));
    process.exitCode = 1;
  } else {
    console.log(chalk.green("All checks passed."));
  }
}

export async function syncCmd(): Promise<void> {
  const client = new McpgramClient();
  console.log(chalk.bold("Syncing workspace…"));
  const servers = await client.listMcpServers();
  for (const s of servers.servers) {
    if (s.provider_type === "external_mcp" || s.provider_type === "external") {
      try {
        await client.refreshMcpServer(s.server_id);
        console.log(chalk.green(`✓ refreshed ${s.name}`));
      } catch (e) {
        console.log(chalk.red(`✗ ${s.name}: ${e instanceof Error ? e.message : e}`));
      }
    }
  }
  const { setupCmd } = await import("./agents.js");
  try {
    await setupCmd(undefined, { all: true });
  } catch {
    /* ignore */
  }
  const tools = await client.listTools();
  const n = tools.servers.reduce((a, s) => a + s.tools.length, 0);
  console.log(chalk.green(`✓ ${n} tools available`));
}
