import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentProvider, AgentDetection, McpServerEntry, SetupResult, RepairResult } from "./types.js";
import { getMcpEntry, mergeMcpServers, removeMcpServer } from "./json-mcp.js";
import { SERVER_KEY } from "../lib/constants.js";

function which(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(process.platform === "win32" ? "where" : "which", [cmd], {
      stdio: "ignore",
    });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

function configPath(): string {
  return path.join(os.homedir(), ".gemini", "mcp.json");
}

export const geminiProvider: AgentProvider = {
  id: "gemini",
  name: "Gemini CLI",

  async detect(): Promise<AgentDetection> {
    const hasBin = await which("gemini");
    const dir = path.join(os.homedir(), ".gemini");
    return {
      id: this.id,
      name: this.name,
      installed: hasBin || fs.existsSync(dir),
      configPath: configPath(),
    };
  },

  async setup(entry: McpServerEntry): Promise<SetupResult> {
    if ((await which("gemini")) && entry.url) {
      const ok = await new Promise<boolean>((resolve) => {
        const args = [
          "mcp",
          "add",
          "--scope",
          "user",
          "--transport",
          "http",
          SERVER_KEY,
          entry.url!,
        ];
        const child = spawn("gemini", args, { stdio: "ignore" });
        child.on("close", (code) => resolve(code === 0));
        child.on("error", () => resolve(false));
      });
      if (ok) {
        return {
          id: this.id,
          name: this.name,
          success: true,
          message: "Configured via gemini mcp add",
        };
      }
    }
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
      message: ok ? `Removed from ${p}` : `No entry in ${p}`,
    };
  },

  async repair(entry: McpServerEntry): Promise<RepairResult> {
    await this.setup(entry);
    return { id: this.id, fixed: true, message: `Repaired ${configPath()}` };
  },
};
