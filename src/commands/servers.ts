import chalk from "chalk";
import { McpgramClient } from "../api/client.js";
import { CliError, ExitCode } from "../lib/errors.js";
import { isJson, printJson, printHuman } from "../lib/output.js";
import { success } from "../utils/ui.js";

export async function serversListCmd(): Promise<void> {
  const client = new McpgramClient();
  const data = await client.listMcpServers();
  if (isJson()) {
    printJson(data);
    return;
  }
  printHuman(chalk.bold(`\nServers (workspace ${data.workspace_id})\n`));
  if (!data.servers.length) {
    printHuman(chalk.dim("No servers. Connect: mcpgram servers connect <url>"));
    return;
  }
  for (const s of data.servers) {
    const status =
      s.status === "verified" || s.status === "healthy"
        ? chalk.green(s.status)
        : chalk.yellow(s.status);
    console.log(
      `  ${s.name.padEnd(28)} ${status}  tools=${s.tool_count}  ${s.provider_type ?? ""}`
    );
    console.log(chalk.dim(`    ${s.server_id}`));
    console.log(chalk.dim(`    ${s.url}`));
    if (s.last_error) console.log(chalk.red(`    error: ${s.last_error}`));
  }
}

export async function serversGetCmd(id: string): Promise<void> {
  const client = new McpgramClient();
  try {
    const row = await client.getMcpServer(id);
    if (isJson()) {
      printJson(row);
      return;
    }
    console.log(JSON.stringify(row, null, 2));
  } catch {
    const data = await client.listMcpServers();
    const s = data.servers.find((x) => x.server_id === id || x.name === id);
    if (!s) throw new CliError(`Server not found: ${id}`, ExitCode.USAGE);
    if (isJson()) {
      printJson(s);
      return;
    }
    console.log(JSON.stringify(s, null, 2));
  }
}

export async function serversConnectCmd(
  url: string,
  opts: { name?: string; token?: string; type?: string } = {}
): Promise<void> {
  const client = new McpgramClient();
  const authentication =
    opts.token || opts.type
      ? { type: opts.type || "bearer", token: opts.token }
      : undefined;
  const res = await client.connectMcpServer({ url, name: opts.name, authentication });
  if (isJson()) {
    printJson({ ok: true, result: res });
    return;
  }
  success("Server connected");
  console.log(JSON.stringify(res, null, 2));
}

export async function serversDisconnectCmd(id: string): Promise<void> {
  const client = new McpgramClient();
  await client.disconnectMcpServer(id);
  if (isJson()) {
    printJson({ ok: true, disconnected: id });
    return;
  }
  success(`Disconnected ${id}`);
}

export async function serversRemoveCmd(id: string): Promise<void> {
  return serversDisconnectCmd(id);
}
