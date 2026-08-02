import type { McpServerEntry } from "../providers/types.js";
import { getMcpUrl, requireApiKey } from "./config.js";
import { getBearerToken } from "../auth/token.js";

/** Build the MCP server entry agents should use. Prefer OAuth/API key header when available. */
export function buildMcpEntry(): McpServerEntry {
  const url = getMcpUrl();
  const key = getBearerToken();
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
