import chalk from "chalk";
import { APP_URL, MCP_SERVER_URL, CLI_VERSION, MCP_SERVER_ORIGIN } from "../lib/constants.js";
import { getApiBase, getConfigPath, getMcpUrl, loadConfig } from "../lib/config.js";
import { isAuthenticated, maskSecret, getBearerToken } from "../auth/token.js";

export async function infoCmd(): Promise<void> {
  const cfg = loadConfig();
  console.log(chalk.bold("\nMCPGRAM CLI\n"));
  console.log(`  Version:     ${CLI_VERSION}`);
  console.log(`  App:         ${APP_URL}`);
  console.log(`  API:         ${getApiBase()}/api/v1/*`);
  console.log(`  MCP URL:     ${getMcpUrl()}`);
  console.log(`  MCP origin:  ${MCP_SERVER_ORIGIN}`);
  console.log(`  Config:      ${getConfigPath()}`);
  console.log(`  Auth:        ${isAuthenticated() ? "yes" : "no"}`);
  if (isAuthenticated()) {
    const t = getBearerToken();
    if (t) console.log(`  Credential:  ${maskSecret(t)}`);
    if (cfg.workspaceId) console.log(`  Workspace:   ${cfg.workspaceId}`);
  }
  console.log("");
}

export function versionCmd(): void {
  console.log(CLI_VERSION);
}
