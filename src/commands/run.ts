import { McpgramClient } from "../api/client.js";
import { CliError, ExitCode } from "../lib/errors.js";
import { isJson, printJson, printHuman } from "../lib/output.js";
import { success, fail } from "../utils/ui.js";

function parseExtraArgs(argv: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--") || a === "--input" || a === "--json") continue;
    const key = a.replace(/^--/, "").replace(/-/g, "_");
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

export async function runCmd(
  tool: string,
  opts: { input?: string },
  extraArgv: string[] = []
): Promise<void> {
  const client = new McpgramClient();
  let input: Record<string, unknown> = {};
  if (opts.input) {
    try {
      input = JSON.parse(opts.input) as Record<string, unknown>;
    } catch {
      throw new CliError("Invalid --input JSON", ExitCode.USAGE);
    }
  } else {
    input = parseExtraArgs(extraArgv);
  }

  const found = await client.findTool(tool);
  const toolId = found?.tool.tool_id ?? tool;

  const result = await client.execute(toolId, input);

  if (isJson()) {
    printJson({ ok: !result.error, tool: toolId, result });
    if (result.error) process.exitCode = 1;
    return;
  }

  if (result.error) {
    fail(result.error);
    process.exitCode = 1;
    return;
  }
  success(`Executed ${toolId}`);
  if (result.duration_ms != null) printHuman(`Duration: ${result.duration_ms}ms`);
  if (result.output !== undefined) {
    console.log(typeof result.output === "string" ? result.output : JSON.stringify(result.output, null, 2));
  }
}
