import { loadConfig, saveConfig, clearConfig, type McpgramConfig } from "../lib/config.js";

/**
 * Credential storage.
 * Primary: ~/.mcpgram/config.json (mode 0600).
 * TODO: optional keytar (macOS Keychain / Windows Credential Manager / libsecret)
 * when dependency is available — keep file fallback for CI/Termux/WSL.
 */

export type StoredCredentials = {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  expiresAt?: string;
  tokenType?: string;
  workspaceId?: string;
  workspaceName?: string;
  email?: string;
  userId?: string;
};

export function getStoredCredentials(): StoredCredentials {
  const c = loadConfig();
  return {
    accessToken: c.accessToken,
    refreshToken: c.refreshToken,
    apiKey: c.apiKey,
    expiresAt: c.expiresAt,
    tokenType: c.tokenType,
    workspaceId: c.workspaceId,
    workspaceName: c.workspaceName,
    email: c.email,
    userId: c.userId,
  };
}

/** Bearer credential used for API + MCP: prefers API key, then access token. */
export function getBearerToken(): string | undefined {
  const envKey = process.env.MCPGRAM_API_KEY;
  if (envKey) return envKey;
  const c = loadConfig();
  return c.apiKey || c.accessToken;
}

export function storeCredentials(partial: StoredCredentials & Partial<McpgramConfig>): McpgramConfig {
  return saveConfig(partial);
}

export function clearCredentials(): void {
  clearConfig();
}

export function isAuthenticated(): boolean {
  return Boolean(getBearerToken());
}

export function maskSecret(secret: string): string {
  if (!secret || secret.length < 12) return "****";
  return `${secret.slice(0, 6)}…${secret.slice(-4)}`;
}
