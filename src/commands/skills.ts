import chalk from "chalk";
import { installSkills } from "../lib/skills.js";
import { isJson, printJson } from "../lib/output.js";
import { success } from "../utils/ui.js";

export async function installSkillsCmd(opts: {
  claude?: boolean;
  codex?: boolean;
  project?: boolean;
  all?: boolean;
} = {}): Promise<void> {
  const claude = opts.claude || opts.all || (!opts.codex && !opts.claude);
  const codex = opts.codex || opts.all || (!opts.codex && !opts.claude);
  const results = installSkills({
    claude,
    codex,
    project: Boolean(opts.project),
  });

  if (isJson()) {
    printJson({ results });
    return;
  }

  console.log(chalk.bold("\nMCPGRAM CLI skills\n"));
  for (const r of results) {
    const mark = r.ok ? chalk.green("✓") : chalk.red("✗");
    console.log(`${mark} ${r.message}`);
  }
  success("Agents that support skills will pick these up after restart.");
}
