import type { McpServerEntry } from "../providers/types.js";
import { getMcpUrl, loadConfig, requireApiKey } from "./config.js";

/** Build the MCP server entry agents should use. Prefer OAuth URL; attach API key header when available. */
export function buildMcpEntry(): McpServerEntry {
  const url = getMcpUrl();
  const cfg = loadConfig();
  const key = process.env.MCPGRAM_API_KEY || cfg.apiKey;
  if (key) {
    return {
      url,
      headers: { Authorization: `Bearer ${key}` },
    };
  }
  return { url };
}

export function buildMcpEntryAuthenticated(): McpServerEntry {
  const key = requireApiKey();
  return {
    url: getMcpUrl(),
    headers: { Authorization: `Bearer ${key}` },
  };
}
