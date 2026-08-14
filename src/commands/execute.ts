/**
 * mcpgram execute <tool> — Composio-style alias for run with --schema / --dry-run / validation.
 */

import chalk from "chalk";
import { McpgramClient } from "../api/client.js";
import { CliError, ExitCode } from "../lib/errors.js";
import { isJson, printJson, printHuman } from "../lib/output.js";
import { validateAgainstSchema, formatValidationError } from "../lib/validate.js";
import { redactDeep } from "../lib/redact.js";
import { success, fail } from "../utils/ui.js";
import { batchExecuteCmd } from "./batch.js";

function parseExtraArgs(argv: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const skip = new Set([
    "--input", "--json", "--schema", "--get-schema", "--dry-run", "--dry",
    "--batch", "--no-validate", "--sequential",
  ]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--") || skip.has(a)) continue;
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

export async function executeCmd(
  tool: string | undefined,
  opts: {
    input?: string;
    schema?: boolean;
    dryRun?: boolean;
    batch?: string;
    noValidate?: boolean;
    sequential?: boolean;
  } = {},
  extraArgv: string[] = []
): Promise<void> {
  if (opts.batch) {
    await batchExecuteCmd(opts.batch, {
      parallel: !opts.sequential,
      skipValidate: opts.noValidate,
    });
    return;
  }

  if (!tool) {
    throw new CliError(
      "Usage: mcpgram execute <tool> | mcpgram execute --batch file.json",
      ExitCode.USAGE
    );
  }

  const client = new McpgramClient();
  const found = await client.findTool(tool);
  if (!found) {
    throw new CliError(
      `Tool not found: ${tool}. Try: mcpgram search "${tool}"`,
      ExitCode.USAGE
    );
  }

  const toolId = found.tool.tool_id;
  const schema = found.tool.input_schema;

  if (opts.schema) {
    if (isJson()) {
      printJson({
        tool: found.tool.name,
        tool_id: toolId,
        server: found.server,
        description: found.tool.description,
        input_schema: schema ?? null,
      });
      return;
    }
    console.log(chalk.bold(found.tool.name));
    console.log(`ID: ${toolId}`);
    console.log(`Server: ${found.server}`);
    if (found.tool.description) console.log(`\n${found.tool.description}`);
    console.log("\nInput schema:");
    console.log(JSON.stringify(schema ?? {}, null, 2));
    console.log(chalk.dim(`\nRun: mcpgram execute ${found.tool.name} --input '{...}'`));
    return;
  }

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

  if (!opts.noValidate && schema) {
    const issues = validateAgainstSchema(input, schema);
    if (issues.length) {
      const msg = formatValidationError(issues);
      if (opts.dryRun) {
        if (isJson()) {
          printJson({ dry_run: true, valid: false, issues, input: redactDeep(input) });
          process.exitCode = 1;
          return;
        }
        fail(`Schema validation failed: ${msg}`);
        process.exitCode = 1;
        return;
      }
      throw new CliError(`Schema validation failed: ${msg}`, ExitCode.USAGE, "Use --no-validate to skip");
    }
  }

  if (opts.dryRun) {
    if (isJson()) {
      printJson({
        dry_run: true,
        valid: true,
        tool: found.tool.name,
        tool_id: toolId,
        server: found.server,
        input: redactDeep(input),
        input_schema: schema ?? null,
      });
      return;
    }
    printHuman(chalk.bold("Dry run — not executed (schema OK)"));
    printHuman(`Tool: ${found.tool.name} (${toolId})`);
    printHuman(`Server: ${found.server}`);
    printHuman("Input:");
    console.log(JSON.stringify(redactDeep(input), null, 2));
    return;
  }

  const result = await client.execute(toolId, input);
  const safeResult = redactDeep(result);

  if (isJson()) {
    printJson({ ok: !result.error, tool: toolId, result: safeResult });
    if (result.error) process.exitCode = 1;
    return;
  }

  if (result.error) {
    fail(String(result.error));
    process.exitCode = 1;
    return;
  }
  success(`Executed ${found.tool.name}`);
  if (result.duration_ms != null) printHuman(`Duration: ${result.duration_ms}ms`);
  if (result.request_id) printHuman(chalk.dim(`request_id: ${result.request_id}`));
  if (result.output !== undefined) {
    const out = redactDeep(result.output);
    console.log(typeof out === "string" ? out : JSON.stringify(out, null, 2));
  }
}
