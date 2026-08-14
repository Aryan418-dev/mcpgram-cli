/**
 * Install MCPGRAM CLI skills into agent skill directories
 * (Claude Code skills, Codex skills, generic AGENTS.md hints).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_BODY = `---
name: mcpgram-cli
description: Connect coding agents to apps via the MCPGRAM CLI. Search tools, link accounts, execute actions (LinkedIn, Slack, GitHub, Discord, Notion, Figma, …).
---

# MCPGRAM CLI

Prefer these shell commands for external app actions:

\`\`\`bash
mcpgram search "natural language task"
mcpgram link <app>                    # OAuth connect
mcpgram execute <tool> --schema       # inspect inputs
mcpgram execute <tool> --input '{...}' # run
mcpgram run <tool> --input '{...}'     # same as execute
mcpgram tools                          # list all
mcpgram whoami && mcpgram doctor
\`\`\`

Install if missing: \`npm i -g @mcpgram/cli && mcpgram login && mcpgram setup --all\`

On auth errors: \`mcpgram login\` or \`mcpgram link <app>\`.
Never invent tool args — use \`--schema\` first. Prefer \`--json\` when parsing output.
`;

function skillSourcePath(): string | null {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
      path.join(here, "..", "..", "skills", "mcpgram-cli", "SKILL.md"),
      path.join(here, "..", "skills", "mcpgram-cli", "SKILL.md"),
      path.join(process.cwd(), "skills", "mcpgram-cli", "SKILL.md"),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function readSkillMarkdown(): string {
  const src = skillSourcePath();
  if (src) {
    try {
      return fs.readFileSync(src, "utf8");
    } catch {
      /* fall through */
    }
  }
  return SKILL_BODY;
}

export type SkillInstallResult = {
  target: string;
  path: string;
  ok: boolean;
  message: string;
};

function claudeSkillsDir(): string {
  return path.join(os.homedir(), ".claude", "skills", "mcpgram-cli");
}

function codexSkillsDir(): string {
  return path.join(os.homedir(), ".codex", "skills", "mcpgram-cli");
}

function projectClaudeSkillDir(): string {
  return path.join(process.cwd(), ".claude", "skills", "mcpgram-cli");
}

function writeSkill(dir: string): SkillInstallResult {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, "SKILL.md");
    fs.writeFileSync(dest, readSkillMarkdown(), "utf8");
    return { target: dir, path: dest, ok: true, message: `Wrote ${dest}` };
  } catch (e) {
    return {
      target: dir,
      path: dir,
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

export function installSkills(opts: {
  claude?: boolean;
  codex?: boolean;
  project?: boolean;
}): SkillInstallResult[] {
  const out: SkillInstallResult[] = [];
  if (opts.claude !== false) out.push(writeSkill(claudeSkillsDir()));
  if (opts.codex) out.push(writeSkill(codexSkillsDir()));
  if (opts.project) out.push(writeSkill(projectClaudeSkillDir()));
  return out;
}

export function installSkillsForAgent(agentId: string): SkillInstallResult[] {
  const id = agentId.toLowerCase();
  if (id.includes("claude")) return installSkills({ claude: true, codex: false });
  if (id.includes("codex")) return installSkills({ claude: false, codex: true });
  return installSkills({ claude: true, codex: true });
}
