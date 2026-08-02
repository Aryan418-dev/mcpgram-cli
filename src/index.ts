import { Command } from "commander";
import { loginCmd, logoutCmd, whoamiCmd } from "./commands/auth.js";
import {
  agentsCmd,
  scanCmd,
  setupCmd,
  repairCmd,
  uninstallAgentsCmd,
} from "./commands/agents.js";
import { mcpListCmd, mcpAddCmd, mcpRemoveCmd, mcpRefreshCmd } from "./commands/mcp.js";
import { toolsListCmd, toolsSearchCmd, toolsInfoCmd } from "./commands/tools.js";
import { doctorCmd, syncCmd } from "./commands/doctor.js";
import { onboardCmd } from "./commands/onboard.js";
import { workspaceListCmd, workspaceSwitchCmd } from "./commands/workspace.js";
import { appListCmd, appConnectCmd, appDisconnectCmd } from "./commands/app.js";
import { infoCmd, versionCmd } from "./commands/info.js";
import { updateCmd } from "./commands/update.js";
import { CLI_VERSION } from "./lib/constants.js";

const program = new Command();

program
  .name("mcpgram")
  .description("Official MCPGRAM CLI — login once, configure every AI agent")
  .version(CLI_VERSION);

// ── Auth ──────────────────────────────────────────────
program
  .command("login")
  .description("Sign in via browser (PKCE) or API key")
  .option("-k, --key <apiKey>", "API key (CI / skip browser)")
  .option("--no-open", "Do not open the browser")
  .option("--no-browser", "Skip PKCE; use API key prompt only")
  .action(async (opts) => {
    await loginCmd({
      key: opts.key,
      open: opts.open,
      browser: opts.browser,
    });
  });

program.command("logout").description("Remove local credentials").action(logoutCmd);
program.command("whoami").description("Show current session").action(whoamiCmd);

// ── Onboarding ────────────────────────────────────────
program
  .command("onboard")
  .description("Login + detect agents + setup + doctor in one flow")
  .action(onboardCmd);

// ── Agents ────────────────────────────────────────────
program.command("scan").description("Detect installed AI agents").action(scanCmd);
program.command("agents").description("List agent providers and config status").action(agentsCmd);

program
  .command("setup [agent]")
  .description("Configure MCPGRAM on detected agents (or one agent id)")
  .option("--all", "Configure all detected agents")
  .action(async (agent, opts) => {
    await setupCmd(agent, { all: Boolean(opts.all) || !agent });
  });

program.command("repair").description("Repair broken MCPGRAM agent configs").action(repairCmd);

program
  .command("uninstall [agent]")
  .description("Remove MCPGRAM from agent configs")
  .action(async (agent) => {
    await uninstallAgentsCmd(agent);
  });

// ── Diagnostics ───────────────────────────────────────
program.command("doctor").description("Run health checks").action(doctorCmd);
program
  .command("sync")
  .description("Refresh external MCP servers, tools, and agent configs")
  .action(syncCmd);

// ── MCP servers ───────────────────────────────────────
const mcp = program.command("mcp").description("Manage external MCP servers via MCPGRAM API");
mcp.command("list").description("List workspace MCP servers").action(mcpListCmd);
mcp
  .command("add <url>")
  .description("Connect an external MCP server")
  .option("-n, --name <name>", "Display name")
  .option("-t, --token <token>", "Bearer / API token for the upstream server")
  .option("--type <type>", "Auth type: bearer | api_key | basic | none", "bearer")
  .action(async (url, opts) => {
    await mcpAddCmd(url, opts);
  });
mcp.command("remove <serverId>").description("Disconnect MCP server").action(mcpRemoveCmd);
mcp.command("refresh <serverId>").description("Re-discover tools").action(mcpRefreshCmd);

// ── Tools ─────────────────────────────────────────────
const tools = program.command("tools").description("Inspect workspace tools");
tools
  .command("list")
  .description("List tools")
  .option("-s, --server <name>", "Filter by server name")
  .action(async (opts) => toolsListCmd(opts));
tools.command("search <query>").description("Search tools").action(toolsSearchCmd);
tools.command("info <name>").description("Show tool schema").action(toolsInfoCmd);
tools.action(async () => toolsListCmd({}));

// ── Apps ──────────────────────────────────────────────
const app = program.command("app").description("Connected apps (dashboard OAuth)");
app.command("list").description("List connected apps").action(appListCmd);
app
  .command("connect [provider]")
  .description("Open dashboard connect flow")
  .action(async (provider) => appConnectCmd(provider));
app
  .command("disconnect [provider]")
  .description("Disconnect an app (opens dashboard)")
  .action(async (provider) => appDisconnectCmd(provider));

// ── Workspaces ────────────────────────────────────────
const ws = program.command("workspace").description("List and switch workspaces");
ws.command("list").description("List workspaces").action(workspaceListCmd);
ws.command("switch <id>").description("Set default workspace").action(workspaceSwitchCmd);
ws.action(async () => workspaceListCmd());

// ── Utility ───────────────────────────────────────────
program.command("info").description("Show endpoints and session summary").action(infoCmd);
program.command("version").description("Print CLI version").action(versionCmd);
program.command("update").description("Update MCPGRAM CLI to the latest version").action(updateCmd);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
