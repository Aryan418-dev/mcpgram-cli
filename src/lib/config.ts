import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CONFIG_DIR_NAME, APP_URL, MCP_SERVER_URL } from "./constants.js";
import { CliError, ExitCode } from "./errors.js";

export type McpgramConfig = {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: string;
  workspaceId?: string;
  workspaceName?: string;
  email?: string;
  userId?: string;
  mcpUrl?: string;
  apiBase?: string;
  configuredAgents?: string[];
  defaultWorkspaceId?: string;
  defaultServerId?: string;
  outputFormat?: "text" | "json";
  debug?: boolean;
  updatedAt?: string;
};

function configDir(): string {
  return path.join(os.homedir(), CONFIG_DIR_NAME);
}

function configPath(): string {
  return path.join(configDir(), "config.json");
}

export function ensureConfigDir(): string {
  const dir = configDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}

export function loadConfig(): McpgramConfig {
  const p = configPath();
  if (!fs.existsSync(p)) return {};
  try {
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw) as McpgramConfig;
  } catch {
    return {};
  }
}

export function saveConfig(partial: Partial<McpgramConfig>): McpgramConfig {
  ensureConfigDir();
  const next: McpgramConfig = {
    ...loadConfig(),
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  const p = configPath();
  fs.writeFileSync(p, JSON.stringify(next, null, 2) + "\n", { mode: 0o600 });
  try {
    fs.chmodSync(p, 0o600);
  } catch {
    /* windows */
  }
  return next;
}

export function clearConfig(): void {
  const p = configPath();
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

export function requireApiKey(): string {
  const key =
    process.env.MCPGRAM_API_KEY ||
    process.env.MCPGRAM_TOKEN ||
    loadConfig().apiKey ||
    loadConfig().accessToken;
  if (!key) {
    throw new CliError(
      "Not authenticated.",
      ExitCode.AUTH,
      "Run: mcpgram login  (or set MCPGRAM_API_KEY)"
    );
  }
  return key;
}

export function getMcpUrl(): string {
  return process.env.MCPGRAM_MCP_URL || loadConfig().mcpUrl || MCP_SERVER_URL;
}

export function getApiBase(): string {
  return process.env.MCPGRAM_API_URL || loadConfig().apiBase || APP_URL;
}

export function getConfigPath(): string {
  return configPath();
}

/** Public non-secret view of config for `config list`. */
export function getPublicConfig(): Record<string, unknown> {
  const c = loadConfig();
  const out: Record<string, unknown> = {};
  for (const k of [
    "apiBase",
    "mcpUrl",
    "defaultWorkspaceId",
    "defaultServerId",
    "workspaceId",
    "workspaceName",
    "outputFormat",
    "debug",
    "email",
    "userId",
  ] as const) {
    if (c[k] !== undefined) out[k] = c[k];
  }
  out.authenticated = Boolean(
    process.env.MCPGRAM_API_KEY ||
      process.env.MCPGRAM_TOKEN ||
      c.apiKey ||
      c.accessToken
  );
  out.configPath = configPath();
  out.apiBaseEffective = getApiBase();
  out.mcpUrlEffective = getMcpUrl();
  return out;
}

export function setConfigKey(key: string, value: string): McpgramConfig {
  const allowed = new Set([
    "apiBase",
    "mcpUrl",
    "defaultWorkspaceId",
    "defaultServerId",
    "outputFormat",
    "debug",
    "workspaceName",
  ]);
  if (!allowed.has(key)) {
    throw new CliError(
      `Cannot set "${key}" via config (secret or unknown).`,
      ExitCode.USAGE,
      `Allowed: ${[...allowed].join(", ")}`
    );
  }
  if (key === "debug") {
    return saveConfig({ debug: value === "true" || value === "1" });
  }
  if (key === "outputFormat") {
    if (value !== "text" && value !== "json") {
      throw new CliError("outputFormat must be text or json", ExitCode.USAGE);
    }
    return saveConfig({ outputFormat: value });
  }
  return saveConfig({ [key]: value } as Partial<McpgramConfig>);
}
