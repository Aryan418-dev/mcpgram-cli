import chalk from "chalk";
import { McpgramClient } from "../api/client.js";

export async function mcpListCmd(): Promise<void> {
  const client = new McpgramClient();
  const data = await client.listMcpServers();
  console.log(chalk.bold(`\nMCP servers (workspace ${data.workspace_id})\n`));
  if (!data.servers.length) {
    console.log(chalk.dim("No servers. Add one: mcpgram mcp add <url>"));
    return;
  }
  for (const s of data.servers) {
    const status =
      s.status === "verified" || s.status === "healthy"
        ? chalk.green(s.status)
        : chalk.yellow(s.status);
    console.log(
      `  ${s.name.padEnd(28)} ${status.padEnd(20)} tools=${String(s.tool_count).padStart(3)}  ${s.provider_type ?? ""}`
    );
    console.log(chalk.dim(`    ${s.server_id}  ${s.url}`));
  }
}

export async function mcpAddCmd(
  url: string,
  opts: { name?: string; token?: string; type?: string } = {}
): Promise<void> {
  const client = new McpgramClient();
  const authentication =
    opts.token || opts.type
      ? {
          type: opts.type || "bearer",
          token: opts.token,
        }
      : undefined;
  const res = await client.connectMcpServer({
    url,
    name: opts.name,
    authentication,
  });
  console.log(chalk.green("✓ Server connected"));
  console.log(JSON.stringify(res, null, 2));
}

export async function mcpRemoveCmd(serverId: string): Promise<void> {
  const client = new McpgramClient();
  await client.disconnectMcpServer(serverId);
  console.log(chalk.green(`✓ Removed ${serverId}`));
}

export async function mcpRefreshCmd(serverId: string): Promise<void> {
  const client = new McpgramClient();
  const res = await client.refreshMcpServer(serverId);
  console.log(chalk.green(`✓ Refreshed ${serverId}`));
  console.log(JSON.stringify(res, null, 2));
}
