import chalk from "chalk";
import { providers, getProvider } from "../providers/registry.js";
import { buildMcpEntryAuthenticated } from "../lib/entry.js";
import { saveConfig, loadConfig } from "../lib/config.js";
import { installSkillsForAgent, installSkills } from "../lib/skills.js";

export async function scanCmd(): Promise<void> {
  console.log(chalk.bold("\nScanning system for AI agents…\n"));
  const ready: string[] = [];
  for (const p of providers) {
    const d = await p.detect();
    const mark = d.installed ? chalk.green("✓") : chalk.dim("✗");
    console.log(`${mark} ${d.name.padEnd(16)} ${d.installed ? chalk.green("detected") : chalk.dim("not found")}`);
    if (d.configPath) console.log(chalk.dim(`    ${d.configPath}`));
    if (d.installed) ready.push(d.name);
  }
  console.log("");
  if (ready.length) {
    console.log(chalk.bold("Ready to configure:"));
    ready.forEach((n) => console.log(`  • ${n}`));
    console.log(chalk.dim("\nRun: mcpgram setup --all"));
  } else {
    console.log(chalk.yellow("No known agents detected. You can still force-setup: mcpgram setup cursor"));
  }
}

export async function agentsCmd(): Promise<void> {
  console.log(chalk.bold("\nSupported agent providers\n"));
  for (const p of providers) {
    const status = await p.readStatus();
    const mark = status.configured ? chalk.green("configured") : chalk.dim("not configured");
    console.log(`  ${p.id.padEnd(16)} ${p.name.padEnd(16)} ${mark}`);
  }
}

export async function setupCmd(
  target?: string,
  opts: { all?: boolean; installSkills?: boolean } = {}
): Promise<void> {
  const entry = buildMcpEntryAuthenticated();
  const normalized =
    target === "claude" ? "claude-code" : target === "auto" ? undefined : target;

  const list =
    opts.all || !normalized
      ? providers
      : (() => {
          const p = getProvider(normalized);
          if (!p) {
            console.error(chalk.red(`Unknown agent: ${normalized}`));
            console.error(`Known: ${providers.map((x) => x.id).join(", ")}`);
            process.exitCode = 1;
            return [];
          }
          return [p];
        })();

  if (!list.length) return;

  const toRun: typeof providers = [];
  for (const p of list) {
    if (opts.all || !normalized) {
      const d = await p.detect();
      if (d.installed || normalized) toRun.push(p);
    } else {
      toRun.push(p);
    }
  }

  if (!toRun.length) {
    console.log(chalk.yellow("No installed agents to configure. Use: mcpgram setup <id>"));
    return;
  }

  console.log(chalk.bold("\nConfiguring agents…\n"));
  const configured: string[] = [];
  for (const p of toRun) {
    const result = await p.setup(entry);
    const mark = result.success ? chalk.green("✓") : chalk.red("✗");
    console.log(`${mark} ${result.name}: ${result.message}`);
    if (result.success) configured.push(p.id);
  }
  const prev = loadConfig().configuredAgents ?? [];
  saveConfig({ configuredAgents: Array.from(new Set([...prev, ...configured])) });

  if (opts.installSkills !== false) {
    console.log(chalk.bold("\nInstalling CLI skills…"));
    const skillTargets = configured.length ? configured : toRun.map((p) => p.id);
    const seen = new Set<string>();
    for (const id of skillTargets) {
      const key = id.includes("claude") ? "claude" : id.includes("codex") ? "codex" : id;
      if (seen.has(key)) continue;
      seen.add(key);
      for (const r of installSkillsForAgent(id)) {
        console.log(`${r.ok ? chalk.green("✓") : chalk.red("✗")} skill: ${r.message}`);
      }
    }
    if (opts.all || !normalized) {
      for (const r of installSkills({ claude: true, codex: true })) {
        console.log(chalk.dim(`  ${r.message}`));
      }
    }
  }

  console.log(chalk.green("\nDone. Restart agents to load MCPGRAM tools."));
  console.log(chalk.dim("Shell path: mcpgram search | link | execute  (same as Composio-style CLI surface)"));
}

export async function repairCmd(): Promise<void> {
  const entry = buildMcpEntryAuthenticated();
  console.log(chalk.bold("\nRepairing agent configs…\n"));
  for (const p of providers) {
    const status = await p.readStatus();
    if (!status.configured) continue;
    const r = await p.repair(entry);
    console.log(`${r.fixed ? chalk.green("✓") : chalk.red("✗")} ${p.name}: ${r.message}`);
  }
}

export async function uninstallAgentsCmd(target?: string): Promise<void> {
  const list = target
    ? (() => {
        const p = getProvider(target);
        return p ? [p] : [];
      })()
    : providers;

  if (target && !list.length) {
    console.error(chalk.red(`Unknown agent: ${target}`));
    process.exitCode = 1;
    return;
  }

  for (const p of list) {
    const r = await p.uninstall();
    console.log(`${r.success ? chalk.green("✓") : chalk.dim("·")} ${p.name}: ${r.message}`);
  }
}
