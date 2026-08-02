import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentProvider, AgentDetection, McpServerEntry, SetupResult, RepairResult } from "./types.js";
import { SERVER_KEY } from "../lib/constants.js";

function configPath(): string {
  return path.join(os.homedir(), ".codex", "config.toml");
}

function upsertTomlMcp(filePath: string, entry: McpServerEntry): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const section = `[mcp_servers.${SERVER_KEY}]`;
  const lines = [
    section,
    entry.url ? `url = "${entry.url}"` : "",
    entry.headers?.Authorization
      ? `http_headers = { Authorization = "${entry.headers.Authorization}" }`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (content.includes(section)) {
    content = content.replace(
      new RegExp(`\\[mcp_servers\\.${SERVER_KEY}\\][\\s\\S]*?(?=\\n\\[|$)`, "m"),
      lines + "\n"
    );
  } else {
    content = content.trimEnd() + (content ? "\n\n" : "") + lines + "\n";
  }
  fs.writeFileSync(filePath, content, "utf8");
}

function removeTomlMcp(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, "utf8");
  if (!content.includes(`[mcp_servers.${SERVER_KEY}]`)) return false;
  content = content.replace(
    new RegExp(`\\n*\\[mcp_servers\\.${SERVER_KEY}\\][\\s\\S]*?(?=\\n\\[|$)`, "m"),
    "\n"
  );
  fs.writeFileSync(filePath, content.trim() + "\n", "utf8");
  return true;
}

export const codexProvider: AgentProvider = {
  id: "codex",
  name: "Codex CLI",

  async detect(): Promise<AgentDetection> {
    const p = configPath();
    const dir = path.join(os.homedir(), ".codex");
    return {
      id: this.id,
      name: this.name,
      installed: fs.existsSync(dir) || fs.existsSync(p),
      configPath: p,
    };
  },

  async setup(entry: McpServerEntry): Promise<SetupResult> {
    const p = configPath();
    upsertTomlMcp(p, entry);
    return {
      id: this.id,
      name: this.name,
      success: true,
      configPath: p,
      message: `Wrote MCPGRAM to ${p}`,
    };
  },

  async readStatus() {
    const p = configPath();
    const configured =
      fs.existsSync(p) && fs.readFileSync(p, "utf8").includes(`[mcp_servers.${SERVER_KEY}]`);
    return { configured, configPath: p };
  },

  async uninstall(): Promise<SetupResult> {
    const p = configPath();
    const ok = removeTomlMcp(p);
    return {
      id: this.id,
      name: this.name,
      success: ok,
      configPath: p,
      message: ok ? `Removed from ${p}` : `No entry in ${p}`,
    };
  },

  async repair(entry: McpServerEntry): Promise<RepairResult> {
    await this.setup(entry);
    return { id: this.id, fixed: true, message: `Repaired ${configPath()}` };
  },
};
