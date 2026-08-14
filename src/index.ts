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
import { toolsListCmd, toolsSearchCmd, toolsInfoCmd, toolsGetCmd } from "./commands/tools.js";
import { doctorCmd, syncCmd } from "./commands/doctor.js";
import { onboardCmd } from "./commands/onboard.js";
import { workspaceListCmd, workspaceSwitchCmd } from "./commands/workspace.js";
import { appListCmd, appConnectCmd, appDisconnectCmd } from "./commands/app.js";
import { infoCmd, versionCmd } from "./commands/info.js";
import { updateCmd } from "./commands/update.js";
import { configGetCmd, configListCmd, configSetCmd } from "./commands/config.js";
import { runCmd } from "./commands/run.js";
import {
  serversListCmd,
  serversGetCmd,
  serversConnectCmd,
  serversDisconnectCmd,
  serversRemoveCmd,
} from "./commands/servers.js";
import { initCmd } from "./commands/init.js";
import { deployCmd } from "./commands/deploy.js";
import { logsListCmd, logsGetCmd } from "./commands/logs.js";
import { keysListCmd, keysCreateCmd, keysRevokeCmd } from "./commands/keys.js";
import {
  marketplaceSearchCmd,
  marketplaceGetCmd,
  marketplaceInstallCmd,
  marketplacePublishCmd,
} from "./commands/marketplace.js";
import { registerParityCommands } from "./register-parity.js";
import { CLI_VERSION } from "./lib/constants.js";
import { setGlobalOpts, handleCommandError, isJson } from "./lib/output.js";

const program = new Command();

program
  .name("mcpgram")
  .description("Official MCPGRAM CLI — login once, configure every AI agent")
  .version(CLI_VERSION)
  .option("--json", "Machine-readable JSON on stdout")
  .option("--debug", "Verbose errors / stack traces")
  .option("--quiet", "Minimal human output")
  .option("-y, --yes", "Skip confirmation prompts (CI)")
  .hook("preAction", (thisCommand) => {
    const opts = thisCommand.optsWithGlobals() as {
      json?: boolean;
      debug?: boolean;
      quiet?: boolean;
      yes?: boolean;
    };
    setGlobalOpts({
      json: opts.json,
      debug: opts.debug,
      quiet: opts.quiet,
      yes: opts.yes,
    });
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap(fn: (...args: any[]) => Promise<void> | void) {
  return async (...args: any[]) => {
    try {
      await fn(...args);
    } catch (e) {
      handleCommandError(e);
    }
  };
}

// ── Auth ──────────────────────────────────────────────
program
  .command("login")
  .description("Sign in via browser (PKCE) or API key")
  .option("-k, --key <apiKey>", "API key (CI / skip browser)")
  .option("--no-open", "Do not open the browser")
  .option("--no-browser", "Skip PKCE; use API key prompt only")
  .action(
    wrap(async (opts: { key?: string; open?: boolean; browser?: boolean }) => {
      await loginCmd({
        key: opts.key,
        open: opts.open,
        browser: opts.browser,
      });
    })
  );

program.command("logout").description("Remove local credentials").action(wrap(logoutCmd));
program.command("whoami").description("Show current session").action(wrap(whoamiCmd));

// ── Config ────────────────────────────────────────────
const config = program.command("config").description("CLI configuration");
config.command("list").description("List non-secret config").action(wrap(configListCmd));
config.command("get <key>").description("Get a config value").action(wrap(configGetCmd));
config
  .command("set <key> <value>")
  .description("Set a non-secret config value")
  .action(wrap(configSetCmd));
config.action(wrap(configListCmd));

// ── Onboard / agents ──────────────────────────────────
program
  .command("onboard")
  .description("Login + detect agents + setup + doctor in one flow")
  .action(wrap(onboardCmd));
program.command("scan").description("Detect installed AI agents").action(wrap(scanCmd));
program.command("agents").description("List agent providers and config status").action(wrap(agentsCmd));
program
  .command("setup [agent]")
  .description("Configure MCPGRAM on detected agents (or one agent id)")
  .option("-a, --all", "Configure all detected agents")
  .option("-t, --target <id>", "Alias for agent id (claude | codex | auto)")
  .option("--skills", "Install CLI skills into agent skill dirs", true)
  .option("--no-skills", "Skip skill install")
  .action(
    wrap(async (agent: string | undefined, opts: { all?: boolean; target?: string; skills?: boolean }) => {
      const id = agent || (opts.target === "auto" ? undefined : opts.target);
      const all = opts.all || opts.target === "auto" || (!id && !opts.target);
      await setupCmd(id, { all, installSkills: opts.skills !== false });
    })
  );
program.command("repair").description("Repair broken MCPGRAM agent configs").action(wrap(repairCmd));
program
  .command("uninstall [agent]")
  .description("Remove MCPGRAM from agent configs")
  .action(wrap(uninstallAgentsCmd));

program.command("doctor").description("Run health checks").action(wrap(doctorCmd));
program
  .command("sync")
  .description("Refresh external MCP servers, tools, and agent configs")
  .action(wrap(syncCmd));

// ── Servers ───────────────────────────────────────────
const servers = program.command("servers").description("Manage MCP servers");
servers.command("list").description("List servers").action(wrap(serversListCmd));
servers.command("get <id>").description("Get server details").action(wrap(serversGetCmd));
servers
  .command("connect <url>")
  .description("Connect an external MCP server")
  .option("-n, --name <name>", "Display name")
  .option("-t, --token <token>", "Bearer / API token")
  .option("--type <type>", "Auth type: bearer | api_key | basic | none", "bearer")
  .action(
    wrap(async (url: string, opts: { name?: string; token?: string; type?: string }) => {
      await serversConnectCmd(url, opts);
    })
  );
servers
  .command("disconnect <id>")
  .description("Disconnect server")
  .action(wrap(serversDisconnectCmd));
servers.command("remove <id>").description("Remove server").action(wrap(serversRemoveCmd));
servers.action(wrap(serversListCmd));

// ── MCP servers (legacy names — preserved) ────────────
const mcp = program.command("mcp").description("Manage external MCP servers via MCPGRAM API");
mcp.command("list").description("List workspace MCP servers").action(wrap(mcpListCmd));
mcp
  .command("add <url>")
  .description("Connect an external MCP server")
  .option("-n, --name <name>", "Display name")
  .option("-t, --token <token>", "Bearer / API token for the upstream server")
  .option("--type <type>", "Auth type: bearer | api_key | basic | none", "bearer")
  .action(wrap(async (url: string, opts: { name?: string; token?: string; type?: string }) => mcpAddCmd(url, opts)));
mcp.command("remove <serverId>").description("Disconnect MCP server").action(wrap(mcpRemoveCmd));
mcp.command("refresh <serverId>").description("Re-discover tools").action(wrap(mcpRefreshCmd));

// ── Tools ─────────────────────────────────────────────
const tools = program.command("tools").description("Inspect workspace tools");
tools
  .command("list")
  .description("List tools")
  .option("-s, --server <name>", "Filter by server name")
  .option("--search <query>", "Search tools")
  .action(wrap(async (opts: { server?: string; search?: string }) => toolsListCmd(opts)));
tools.command("search <query>").description("Search tools").action(wrap(toolsSearchCmd));
tools.command("info <name>").description("Show tool schema").action(wrap(toolsInfoCmd));
tools.command("get <name>").description("Show tool schema").action(wrap(toolsGetCmd));
tools
  .option("-s, --server <name>", "Filter by server")
  .option("--search <query>", "Search")
  .action(wrap(async (opts: { server?: string; search?: string }) => toolsListCmd(opts)));

// ── Run ───────────────────────────────────────────────
program
  .command("run <tool>")
  .description("Execute a tool by name or tool_id")
  .option("--input <json>", "JSON object of arguments")
  .allowUnknownOption(true)
  .allowExcessArguments(true)
  .action(
    wrap(async (tool: string, opts: { input?: string }, cmd: Command) => {
      const extra = cmd.args.slice(1);
      await runCmd(tool, opts, process.argv.slice(process.argv.indexOf(tool) + 1));
    })
  );

// ── Init / deploy ─────────────────────────────────────
program
  .command("init [name]")
  .description("Scaffold a local MCPGRAM project")
  .action(wrap(initCmd));
program.command("deploy").description("Validate project for MCPGRAM").action(wrap(deployCmd));

// ── Logs ──────────────────────────────────────────────
const logs = program.command("logs").description("Activity / tool-call logs");
logs
  .command("list")
  .description("List recent activity (dashboard-backed)")
  .option("--limit <n>", "Limit")
  .option("--server <name>", "Filter by server")
  .action(wrap(async (opts: { limit?: string; server?: string }) => logsListCmd(opts)));
logs.command("get <id>").description("Get a log/trace by id").action(wrap(logsGetCmd));
logs.action(wrap(logsListCmd));

// ── Keys ──────────────────────────────────────────────
const keys = program.command("keys").description("API keys (dashboard-managed)");
keys.command("list").description("Open/list keys guidance").action(wrap(keysListCmd));
keys
  .command("create")
  .description("Create key (opens dashboard)")
  .option("--no-open", "Do not open browser")
  .action(wrap(async (opts: { open?: boolean }) => keysCreateCmd(opts)));
keys.command("revoke <id>").description("Revoke key guidance").action(wrap(keysRevokeCmd));
keys.action(wrap(keysListCmd));

// ── Marketplace ───────────────────────────────────────
const market = program.command("marketplace").description("Apps / connector catalog");
market.command("search <query>").description("Search apps").action(wrap(marketplaceSearchCmd));
market.command("get <id>").description("App details URL").action(wrap(marketplaceGetCmd));
market.command("install <id>").description("Open connect flow").action(wrap(marketplaceInstallCmd));
market.command("publish").description("Publish (not available yet)").action(wrap(marketplacePublishCmd));

// ── Apps ──────────────────────────────────────────────
const app = program.command("app").description("Connected apps (dashboard OAuth)");
app.command("list").description("List connected apps").action(wrap(appListCmd));
app
  .command("connect [provider]")
  .description("Open dashboard connect flow")
  .action(wrap(async (provider?: string) => appConnectCmd(provider)));
app
  .command("disconnect [provider]")
  .description("Disconnect an app (opens dashboard)")
  .action(wrap(async (provider?: string) => appDisconnectCmd(provider)));

// ── Workspaces ────────────────────────────────────────
const ws = program.command("workspace").description("List and switch workspaces");
ws.command("list").description("List workspaces").action(wrap(workspaceListCmd));
ws.command("switch <id>").description("Set default workspace").action(wrap(workspaceSwitchCmd));
ws.action(wrap(workspaceListCmd));

// ── Utility ───────────────────────────────────────────
program.command("info").description("Show endpoints and session summary").action(wrap(infoCmd));
program.command("version").description("Print CLI version").action(wrap(versionCmd));
program
  .command("update")
  .alias("upgrade")
  .description("Update MCPGRAM CLI to the latest version")
  .option("--check", "Only check registry; do not install")
  .action(wrap(async (opts: { check?: boolean }) => updateCmd({ check: opts.check, yes: true })));

registerParityCommands(program, wrap);

program.parseAsync(process.argv).catch((err) => {
  if (isJson()) {
    console.log(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  } else {
    console.error(err instanceof Error ? err.message : err);
  }
  process.exitCode = 1;
});
