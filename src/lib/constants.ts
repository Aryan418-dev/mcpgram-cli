export const MCP_SERVER_URL =
  process.env.MCPGRAM_MCP_URL?.replace(/\/$/, "") ||
  "https://mcpgram-mcp-server.vercel.app/mcp";

export const APP_URL =
  process.env.MCPGRAM_APP_URL?.replace(/\/$/, "") || "https://mcpgram.vercel.app";

export const API_BASE =
  process.env.MCPGRAM_API_URL?.replace(/\/$/, "") || APP_URL;

export const CONFIG_DIR_NAME = ".mcpgram";
export const SERVER_KEY = "mcpgram";
