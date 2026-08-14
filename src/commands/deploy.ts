import fs from "node:fs";
import path from "node:path";
import { isJson, isYes, printJson, printHuman } from "../lib/output.js";
import { CliError, ExitCode } from "../lib/errors.js";
import { success, warn, info } from "../utils/ui.js";
import { APP_URL } from "../lib/constants.js";

export async function deployCmd(): Promise<void> {
  const root = process.cwd();
  const cfgPath = path.join(root, "mcpgram.json");
  if (!fs.existsSync(cfgPath)) {
    throw new CliError("No mcpgram.json found", ExitCode.CONFIG, "Run: mcpgram init");
  }

  let cfg: Record<string, unknown>;
  try {
    cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  } catch {
    throw new CliError("Invalid mcpgram.json", ExitCode.CONFIG);
  }

  const issues: string[] = [];
  if (!cfg.name) issues.push("missing name");
  if (!cfg.mcp) issues.push("missing mcp section");

  if (issues.length) {
    throw new CliError(`Validation failed: ${issues.join(", ")}`, ExitCode.CONFIG);
  }

  const plan = {
    name: cfg.name,
    version: cfg.version,
    entry: (cfg.mcp as { entry?: string })?.entry,
    note:
      "MCPGRAM does not host arbitrary user MCP processes yet. Connect external MCP URLs via dashboard or `mcpgram servers connect`.",
    dashboard: `${APP_URL}/dashboard`,
  };

  if (isJson()) {
    printJson({ ok: true, validated: true, deployed: false, plan });
    return;
  }

  printHuman("Deploy plan");
  printHuman(`  Name: ${plan.name}`);
  printHuman(`  Entry: ${plan.entry ?? "—"}`);
  warn(plan.note);
  info(`Open: ${plan.dashboard}`);

  if (!isYes()) {
    printHuman("\nNo remote deploy performed (use dashboard to connect MCP servers).");
    printHuman("Re-run with --yes after connecting your server URL.");
  } else {
    success("Validation OK — connect your MCP URL in the dashboard or via servers connect");
  }
}
