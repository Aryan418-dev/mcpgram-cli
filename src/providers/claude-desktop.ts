import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentProvider, AgentDetection, McpServerEntry, SetupResult, RepairResult } from "./types.js";
import { getMcpEntry, mergeMcpServers, removeMcpServer } from "./json-mcp.js";
import { SERVER_KEY } from "../lib/constants.js";

function configPath(): string {
  const platform = process.platform;
  if (platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json"
    );
  }
  if (platform === "win32") {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
      "Claude",
      "claude_desktop_config.json"
    );
  }
  return path.join(os.homedir(), ".config", "Claude", "claude_desktop_config.json");
}

export const claudeDesktopProvider: AgentProvider = {
  id: "claude-desktop",
  name: "Claude Desktop",

  async detect(): Promise<AgentDetection> {
    const p = configPath();
    const dir = path.dirname(p);
    return {
      id: this.id,
      name: this.name,
      installed: fs.existsSync(dir) || fs.existsSync(p),
      configPath: p,
    };
  },

  async setup(entry: McpServerEntry): Promise<SetupResult> {
    const p = configPath();
    if (entry.url) {
      mergeMcpServers(p, {
        url: entry.url,
        headers: entry.headers,
      });
    } else {
      mergeMcpServers(p, entry);
    }
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
