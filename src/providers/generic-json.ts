import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentProvider, AgentDetection, McpServerEntry, SetupResult, RepairResult } from "./types.js";
import { getMcpEntry, mergeMcpServers, removeMcpServer } from "./json-mcp.js";
import { SERVER_KEY } from "../lib/constants.js";

/**
 * Factory for simple JSON-mcp clients (Cline, OpenCode, Windsurf, Goose, Amp, Aider-style).
 */
export function createJsonProvider(opts: {
  id: string;
  name: string;
  configPaths: string[];
  detectPaths?: string[];
}): AgentProvider {
  const primary = () => {
    for (const p of opts.configPaths) {
      const expanded = p.replace(/^~(?=\/|\\)/, os.homedir());
      if (fs.existsSync(expanded)) return expanded;
    }
    return opts.configPaths[0].replace(/^~(?=\/|\\)/, os.homedir());
  };

  return {
    id: opts.id,
    name: opts.name,

    async detect(): Promise<AgentDetection> {
      const paths = (opts.detectPaths ?? opts.configPaths).map((p) =>
        p.replace(/^~(?=\/|\\)/, os.homedir())
      );
      const installed = paths.some((p) => fs.existsSync(p));
      const cfg = primary();
      return {
        id: opts.id,
        name: opts.name,
        installed,
        configPath: cfg,
      };
    },

    async setup(entry: McpServerEntry): Promise<SetupResult> {
      const p = primary();
      mergeMcpServers(p, entry);
      return {
        id: opts.id,
        name: opts.name,
        success: true,
        configPath: p,
        message: `Wrote MCPGRAM to ${p}`,
      };
    },

    async readStatus() {
      const p = primary();
      const entry = getMcpEntry(p);
      return { configured: Boolean(entry), configPath: p, entry };
    },

    async uninstall(): Promise<SetupResult> {
      const p = primary();
      const ok = removeMcpServer(p);
      return {
        id: opts.id,
        name: opts.name,
        success: ok,
        configPath: p,
        message: ok ? `Removed ${SERVER_KEY} from ${p}` : `No entry in ${p}`,
      };
    },

    async repair(entry: McpServerEntry): Promise<RepairResult> {
      await this.setup(entry);
      return { id: opts.id, fixed: true, message: `Repaired ${primary()}` };
    },
  };
}

export const openCodeProvider = createJsonProvider({
  id: "opencode",
  name: "OpenCode",
  configPaths: ["~/.config/opencode/mcp.json", "~/.opencode/mcp.json"],
  detectPaths: ["~/.config/opencode", "~/.opencode"],
});

export const clineProvider = createJsonProvider({
  id: "cline",
  name: "Cline",
  configPaths: [
    path.join(
      process.platform === "darwin"
        ? path.join(os.homedir(), "Library", "Application Support", "Code", "User", "globalStorage")
        : path.join(os.homedir(), ".config", "Code", "User", "globalStorage"),
      "saoudrizwan.claude-dev",
      "settings",
      "cline_mcp_settings.json"
    ),
  ],
});

export const windsurfProvider = createJsonProvider({
  id: "windsurf",
  name: "Windsurf",
  configPaths: ["~/.codeium/windsurf/mcp_config.json"],
  detectPaths: ["~/.codeium/windsurf"],
});

export const gooseProvider = createJsonProvider({
  id: "goose",
  name: "Goose",
  configPaths: ["~/.config/goose/config.yaml", "~/.config/goose/mcp.json"],
  detectPaths: ["~/.config/goose"],
});

export const ampProvider = createJsonProvider({
  id: "amp",
  name: "Amp",
  configPaths: ["~/.amp/mcp.json", "~/.config/amp/mcp.json"],
  detectPaths: ["~/.amp", "~/.config/amp"],
});

export const aiderProvider = createJsonProvider({
  id: "aider",
  name: "Aider",
  configPaths: ["~/.aider/mcp.json", path.join(process.cwd(), ".aider.mcp.json")],
  detectPaths: ["~/.aider"],
});
