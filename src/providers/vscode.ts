import fs from "node:fs";
import path from "node:path";
import type { AgentProvider, AgentDetection, McpServerEntry, SetupResult, RepairResult } from "./types.js";
import { getMcpEntry, mergeMcpServers, removeMcpServer } from "./json-mcp.js";
import { SERVER_KEY } from "../lib/constants.js";

function configPath(): string {
  return path.join(process.cwd(), ".vscode", "mcp.json");
}

export const vscodeProvider: AgentProvider = {
  id: "vscode",
  name: "VS Code",

  async detect(): Promise<AgentDetection> {
    const p = configPath();
    const hasWorkspace = fs.existsSync(path.join(process.cwd(), ".vscode"));
    return {
      id: this.id,
      name: this.name,
      installed: hasWorkspace || fs.existsSync(p),
      configPath: p,
      notes: "Writes project-level .vscode/mcp.json",
    };
  },

  async setup(entry: McpServerEntry): Promise<SetupResult> {
    const p = configPath();
    mergeMcpServers(p, entry);
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
    const entry = getMcpEntry(p);
    return { configured: Boolean(entry), configPath: p, entry };
  },

  async uninstall(): Promise<SetupResult> {
    const p = configPath();
    const ok = removeMcpServer(p);
    return {
      id: this.id,
      name: this.name,
      success: ok,
      configPath: p,
      message: ok ? `Removed ${SERVER_KEY} from ${p}` : `No entry in ${p}`,
    };
  },

  async repair(entry: McpServerEntry): Promise<RepairResult> {
    await this.setup(entry);
    return { id: this.id, fixed: true, message: `Repaired ${configPath()}` };
  },
};
