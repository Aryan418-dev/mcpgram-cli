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

function projectMcpPath(): string {
  return path.join(process.cwd(), ".mcp.json");
}

function userMcpPath(): string {
  return path.join(os.homedir(), ".claude", "mcp.json");
}

async function runClaudeMcpAdd(entry: McpServerEntry): Promise<{ ok: boolean; message: string }> {
  if (!(await which("claude"))) {
    return { ok: false, message: "claude binary not found on PATH" };
  }
  return new Promise((resolve) => {
    const args = ["mcp", "add", "--transport", "http", SERVER_KEY, entry.url || ""];
    if (entry.headers?.Authorization) {
      args.push("--header", `Authorization: ${entry.headers.Authorization}`);
    }
    const child = spawn("claude", args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout?.on("data", (d) => (out += d.toString()));
    child.stderr?.on("data", (d) => (err += d.toString()));
    child.on("close", (code) => {
      if (code === 0) resolve({ ok: true, message: out.trim() || "claude mcp add succeeded" });
      else resolve({ ok: false, message: err.trim() || out.trim() || `claude exited ${code}` });
    });
    child.on("error", (e) => resolve({ ok: false, message: e.message }));
  });
}

export const claudeCodeProvider: AgentProvider = {
  id: "claude-code",
  name: "Claude Code",

  async detect(): Promise<AgentDetection> {
    const hasBin = await which("claude");
    const hasDir = fs.existsSync(path.join(os.homedir(), ".claude"));
    return {
      id: this.id,
      name: this.name,
      installed: hasBin || hasDir,
      configPath: hasBin ? "claude mcp (CLI)" : userMcpPath(),
      notes: hasBin ? "claude binary found" : undefined,
    };
  },

  async setup(entry: McpServerEntry): Promise<SetupResult> {
    const viaCli = await runClaudeMcpAdd(entry);
    if (viaCli.ok) {
      return {
        id: this.id,
        name: this.name,
        success: true,
        message: viaCli.message,
      };
    }
    const p = projectMcpPath();
    mergeMcpServers(p, entry);
    const user = userMcpPath();
    try {
      mergeMcpServers(user, entry);
    } catch {
      /* ignore */
    }
    return {
      id: this.id,
      name: this.name,
      success: true,
      configPath: p,
      message: `CLI add failed (${viaCli.message}); wrote ${p}`,
    };
  },

  async readStatus() {
    const p = projectMcpPath();
    const entry = getMcpEntry(p) ?? getMcpEntry(userMcpPath());
    return { configured: Boolean(entry), configPath: p, entry };
  },

  async uninstall(): Promise<SetupResult> {
    const removedProject = removeMcpServer(projectMcpPath());
    const removedUser = removeMcpServer(userMcpPath());
    return {
      id: this.id,
      name: this.name,
      success: removedProject || removedUser,
      message:
        removedProject || removedUser
          ? "Removed MCPGRAM from Claude Code config files"
          : "No MCPGRAM entry found for Claude Code",
    };
  },

  async repair(entry: McpServerEntry): Promise<RepairResult> {
    const r = await this.setup(entry);
    return { id: this.id, fixed: r.success, message: r.message };
  },
};
