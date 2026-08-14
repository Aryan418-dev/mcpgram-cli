export const MCP_SERVER_URL =
  process.env.MCPGRAM_MCP_URL?.replace(/\/$/, "") ||
  "https://mcpgram-mcp-server.vercel.app/mcp";

/** Origin without /mcp path — used for OAuth well-known + DCR */
export const MCP_SERVER_ORIGIN =
  process.env.MCPGRAM_MCP_ORIGIN?.replace(/\/$/, "") ||
  MCP_SERVER_URL.replace(/\/mcp\/?$/, "") ||
  "https://mcpgram-mcp-server.vercel.app";

export const APP_URL =
  process.env.MCPGRAM_APP_URL?.replace(/\/$/, "") || "https://mcpgram.vercel.app";

export const API_BASE =
  process.env.MCPGRAM_API_URL?.replace(/\/$/, "") || APP_URL;

export const CONFIG_DIR_NAME = ".mcpgram";
export const SERVER_KEY = "mcpgram";
export const CLI_VERSION = "0.4.0";
export const USER_AGENT = `mcpgram-cli/${CLI_VERSION}`;
