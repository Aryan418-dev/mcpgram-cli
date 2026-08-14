/**
 * mcpgram search <query> — natural-language tool discovery (Composio parity).
 */

import chalk from "chalk";
import { McpgramClient } from "../api/client.js";
import { rankTools, suggestPlan } from "../lib/search.js";
import { isJson, printJson, printHuman } from "../lib/output.js";

export async function searchCmd(
  query: string,
  opts: { limit?: string } = {}
): Promise<void> {
  const client = new McpgramClient();
  const data = await client.listTools();
  const ranked = rankTools(query, data.servers);
  const limit = Math.max(1, Math.min(50, Number(opts.limit) || 12));
  const top = ranked.slice(0, limit);
  const plan = suggestPlan(query, ranked);

  if (isJson()) {
    printJson({
      query,
      total: ranked.length,
      tools: top.map((r) => ({
        name: r.tool.name,
        tool_id: r.tool.tool_id,
        server: r.server,
        status: r.serverStatus,
        score: r.score,
        description: r.tool.description,
        reasons: r.reasons,
      })),
      plan,
    });
    return;
  }

  printHuman(chalk.bold(`\nSearch: ${query}`) + chalk.dim(`  (${ranked.length} matches)\n`));

  if (!top.length) {
    printHuman(chalk.yellow("No matching tools."));
    for (const p of plan) printHuman(chalk.dim(`  • ${p}`));
    return;
  }

  for (const r of top) {
    const score = chalk.dim(`[${r.score}]`);
    console.log(`  ${chalk.cyan(r.tool.name)}  ${score}`);
    console.log(chalk.dim(`    ${r.server} · ${r.tool.tool_id}`));
    if (r.tool.description) {
      console.log(chalk.dim(`    ${r.tool.description.slice(0, 140)}`));
    }
  }

  printHuman(chalk.bold("\nSuggested plan"));
  for (const p of plan) console.log(chalk.dim(`  → ${p}`));
  printHuman("");
}
