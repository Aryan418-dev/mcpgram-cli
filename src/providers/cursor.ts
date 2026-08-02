import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentProvider, AgentDetection, McpServerEntry, SetupResult, RepairResult } from "./types.js";
import { getMcpEntry, mergeMcpServers, removeMcpServer } from "./json-mcp.js";
import { SERVER_KEY } from "../lib/constants.js";

function configPath(): string {
  return path.join(os.homedir(), ".cursor", "mcp.json");
}

export const cursorProvider: AgentProvider = {
  id: "cursor",
  name: "Cursor",

  async detect(): Promise<AgentDetection> {
    const p = configPath();
    const cursorDir = path.join(os.homedir(), ".cursor");
    const installed =
      fs.existsSync(cursorDir) ||
      fs.existsSync(path.join(os.homedir(), "Library", "Application Support", "Cursor")) ||
      fs.existsSync(path.join(os.homedir(), "AppData", "Roaming", "Cursor"));
    return {
      id: this.id,
      name: this.name,
      installed,
      configPath: p,
      notes: installed ? undefined : "Cursor not detected; config will still be written if you force setup",
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
      message: ok ? `Removed ${SERVER_KEY} from ${p}` : `No ${SERVER_KEY} entry in ${p}`,
    };
  },

  async repair(entry: McpServerEntry): Promise<RepairResult> {
    const p = configPath();
    mergeMcpServers(p, entry);
    return { id: this.id, fixed: true, message: `Repaired MCPGRAM entry in ${p}` };
  },
};
