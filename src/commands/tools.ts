import chalk from "chalk";
import { McpgramClient } from "../api/client.js";
import { CliError, ExitCode } from "../lib/errors.js";
import { isJson, printJson, printHuman } from "../lib/output.js";

export async function toolsListCmd(opts: { server?: string; search?: string } = {}): Promise<void> {
  const client = new McpgramClient();
  const data = await client.listTools(opts.server);
  let servers = data.servers;
  if (opts.search) {
    const q = opts.search.toLowerCase();
    servers = servers
      .map((s) => ({
        ...s,
        tools: s.tools.filter((t) =>
          `${t.name} ${t.description ?? ""} ${s.name}`.toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.tools.length > 0);
  }
  if (isJson()) {
    printJson({ servers });
    return;
  }
  let total = 0;
  for (const s of servers) {
    printHuman(chalk.bold(`\n${s.name}`) + chalk.dim(` (${s.status})`));
    for (const t of s.tools) {
      total++;
      console.log(`  ${t.name}`);
      if (t.description) console.log(chalk.dim(`    ${t.description.slice(0, 120)}`));
    }
  }
  printHuman(chalk.dim(`\n${total} tools`));
}

export async function toolsSearchCmd(query: string): Promise<void> {
  return toolsListCmd({ search: query });
}

export async function toolsInfoCmd(name: string): Promise<void> {
  const client = new McpgramClient();
  const found = await client.findTool(name);
  if (!found) {
    throw new CliError(`Tool not found: ${name}`, ExitCode.USAGE);
  }
  const { tool, server } = found;
  if (isJson()) {
    printJson({ tool, server });
    return;
  }
  console.log(chalk.bold(tool.name));
  console.log(`Server: ${server}`);
  console.log(`ID: ${tool.tool_id}`);
  if (tool.description) console.log(`\n${tool.description}`);
  if (tool.input_schema) {
    console.log("\nInput schema:");
    console.log(JSON.stringify(tool.input_schema, null, 2));
  }
}

export async function toolsGetCmd(name: string): Promise<void> {
  return toolsInfoCmd(name);
}
