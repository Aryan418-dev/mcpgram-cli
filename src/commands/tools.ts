import chalk from "chalk";
import { McpgramClient } from "../api/client.js";

export async function toolsListCmd(opts: { server?: string } = {}): Promise<void> {
  const client = new McpgramClient();
  const data = await client.listTools(opts.server);
  let total = 0;
  for (const s of data.servers) {
    console.log(chalk.bold(`\n${s.name}`) + chalk.dim(` (${s.status})`));
    for (const t of s.tools) {
      total++;
      console.log(`  ${t.name}`);
      if (t.description) console.log(chalk.dim(`    ${t.description.slice(0, 120)}`));
    }
  }
  console.log(chalk.dim(`\n${total} tools`));
}

export async function toolsSearchCmd(query: string): Promise<void> {
  const client = new McpgramClient();
  const data = await client.listTools();
  const q = query.toLowerCase();
  const hits: Array<{ server: string; name: string; description?: string | null }> = [];
  for (const s of data.servers) {
    for (const t of s.tools) {
      const hay = `${t.name} ${t.description ?? ""} ${s.name}`.toLowerCase();
      if (hay.includes(q)) hits.push({ server: s.name, name: t.name, description: t.description });
    }
  }
  if (!hits.length) {
    console.log(chalk.yellow(`No tools matching "${query}"`));
    return;
  }
  for (const h of hits) {
    console.log(`${chalk.cyan(h.server)} / ${h.name}`);
    if (h.description) console.log(chalk.dim(`  ${h.description.slice(0, 140)}`));
  }
}

export async function toolsInfoCmd(name: string): Promise<void> {
  const client = new McpgramClient();
  const data = await client.listTools();
  for (const s of data.servers) {
    for (const t of s.tools) {
      if (t.name === name || t.tool_id === name || t.name.toLowerCase() === name.toLowerCase()) {
        console.log(chalk.bold(t.name));
        console.log(`Server: ${s.name}`);
        console.log(`ID: ${t.tool_id}`);
        if (t.description) console.log(`\n${t.description}`);
        if (t.input_schema) {
          console.log("\nInput schema:");
          console.log(JSON.stringify(t.input_schema, null, 2));
        }
        return;
      }
    }
  }
  console.error(chalk.red(`Tool not found: ${name}`));
  process.exitCode = 1;
}
