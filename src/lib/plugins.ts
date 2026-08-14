/**
 * Install native agent plugins (Claude Code marketplace package + Codex skill).
 * Dual-surface: plugins teach the agent to drive the mcpgram CLI.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { installSkillsForAgent } from "./skills.js";

const execFileAsync = promisify(execFile);

export type PluginInstallResult = {
  target: string;
  ok: boolean;
  message: string;
  path?: string;
};

function repoRootCandidates(): string[] {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return [
    path.join(here, "..", ".."),
    path.join(here, "..", "..", ".."),
    process.cwd(),
  ];
}

/** Locate plugins/claude-code/plugins/mcpgram in package or cwd */
export function findClaudePluginRoot(): string | null {
  for (const root of repoRootCandidates()) {
    const p = path.join(root, "plugins", "claude-code", "plugins", "mcpgram");
    if (fs.existsSync(path.join(p, ".claude-plugin", "plugin.json"))) return p;
  }
  return null;
}

export function findCodexSkillSource(): string | null {
  for (const root of repoRootCandidates()) {
    const p = path.join(root, "plugins", "codex", "skills", "mcpgram-cli", "SKILL.md");
    if (fs.existsSync(p)) return p;
    const fallback = path.join(root, "skills", "mcpgram-cli", "SKILL.md");
    if (fs.existsSync(fallback)) return fallback;
  }
  return null;
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

/**
 * Install Claude Code plugin into a local plugins path Claude can load.
 * Also writes the standalone skill under ~/.claude/skills.
 */
export function installClaudePlugin(): PluginInstallResult[] {
  const results: PluginInstallResult[] = [];
  const pluginSrc = findClaudePluginRoot();

  const skillResults = installSkillsForAgent("claude-code");
  for (const r of skillResults) {
    results.push({
      target: "claude-skill",
      ok: r.ok,
      message: r.message,
      path: r.path,
    });
  }

  if (!pluginSrc) {
    results.push({
      target: "claude-plugin",
      ok: false,
      message:
        "Plugin sources not found in package. Install skill only. Manual: /plugin marketplace add Aryan418-dev/mcpgram-cli then /plugin install mcpgram@mcpgram",
    });
    return results;
  }

  const localPluginDir = path.join(os.homedir(), ".claude", "plugins", "local", "mcpgram");
  try {
    if (fs.existsSync(localPluginDir)) {
      fs.rmSync(localPluginDir, { recursive: true, force: true });
    }
    copyDirRecursive(pluginSrc, localPluginDir);
    for (const hook of ["session-start.sh", "user-prompt-submit.sh"]) {
      const hp = path.join(localPluginDir, "hooks", hook);
      if (fs.existsSync(hp)) {
        try {
          fs.chmodSync(hp, 0o755);
        } catch {
          /* ignore */
        }
      }
    }
    results.push({
      target: "claude-plugin-local",
      ok: true,
      message: `Installed local plugin → ${localPluginDir}`,
      path: localPluginDir,
    });
  } catch (e) {
    results.push({
      target: "claude-plugin-local",
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  results.push({
    target: "claude-plugin-marketplace-hint",
    ok: true,
    message:
      "Optional marketplace: /plugin marketplace add Aryan418-dev/mcpgram-cli  then  /plugin install mcpgram@mcpgram",
  });

  return results;
}

/** Install Codex skill under ~/.codex/skills */
export function installCodexPlugin(): PluginInstallResult[] {
  const results: PluginInstallResult[] = [];
  const skillResults = installSkillsForAgent("codex");
  for (const r of skillResults) {
    results.push({
      target: "codex-skill",
      ok: r.ok,
      message: r.message,
      path: r.path,
    });
  }

  const src = findCodexSkillSource();
  if (src) {
    const destDir = path.join(os.homedir(), ".codex", "skills", "mcpgram-cli");
    try {
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, path.join(destDir, "SKILL.md"));
      results.push({
        target: "codex-skill-file",
        ok: true,
        message: `Wrote ${path.join(destDir, "SKILL.md")}`,
        path: path.join(destDir, "SKILL.md"),
      });
    } catch (e) {
      results.push({
        target: "codex-skill-file",
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return results;
}

export async function tryClaudeCliPluginInstall(): Promise<PluginInstallResult | null> {
  try {
    await execFileAsync("claude", ["--version"], { timeout: 5000 });
  } catch {
    return null;
  }
  return {
    target: "claude-cli",
    ok: true,
    message:
      "Claude CLI detected. Run inside Claude Code: /plugin marketplace add Aryan418-dev/mcpgram-cli && /plugin install mcpgram@mcpgram",
  };
}

export function installPluginsForTarget(target: string): PluginInstallResult[] {
  const id = target.toLowerCase();
  if (id.includes("claude")) return installClaudePlugin();
  if (id.includes("codex")) return installCodexPlugin();
  if (id === "auto" || id === "all") {
    return [...installClaudePlugin(), ...installCodexPlugin()];
  }
  return [...installClaudePlugin(), ...installCodexPlugin()];
}
