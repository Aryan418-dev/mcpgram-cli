/**
 * mcpgram execute --batch <file.json>
 * File format: [ { "tool": "name", "input": {} }, ... ] or { "calls": [...] }
 */

import fs from "node:fs";
import chalk from "chalk";
import { McpgramClient } from "../api/client.js";
import { CliError, ExitCode } from "../lib/errors.js";
import { isJson, printJson, printHuman } from "../lib/output.js";
import { validateAgainstSchema, formatValidationError } from "../lib/validate.js";
import { redactDeep } from "../lib/redact.js";
import { success, fail } from "../utils/ui.js";

type BatchCall = { tool: string; input?: Record<string, unknown> };

function loadBatch(filePath: string): BatchCall[] {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    throw new CliError(`Cannot read batch file: ${filePath}`, ExitCode.USAGE);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CliError("Batch file is not valid JSON", ExitCode.USAGE);
  }
  const list = Array.isArray(parsed)
    ? parsed
    : (parsed as { calls?: unknown })?.calls;
  if (!Array.isArray(list) || !list.length) {
    throw new CliError(
      'Batch must be an array of { tool, input } or { "calls": [...] }',
      ExitCode.USAGE
    );
  }
  return list.map((item, i) => {
    const row = item as BatchCall;
    if (!row || typeof row.tool !== "string") {
      throw new CliError(`Batch item ${i} missing string "tool"`, ExitCode.USAGE);
    }
    return { tool: row.tool, input: (row.input as Record<string, unknown>) ?? {} };
  });
}

export async function batchExecuteCmd(
  filePath: string,
  opts: { parallel?: boolean; skipValidate?: boolean } = {}
): Promise<void> {
  const calls = loadBatch(filePath);
  const client = new McpgramClient();
  const parallel = opts.parallel !== false;

  type ResultRow = {
    tool: string;
    tool_id?: string;
    ok: boolean;
    error?: string;
    output?: unknown;
    duration_ms?: number;
  };

  const runOne = async (call: BatchCall): Promise<ResultRow> => {
    const found = await client.findTool(call.tool);
    if (!found) {
      return { tool: call.tool, ok: false, error: `Tool not found: ${call.tool}` };
    }
    if (!opts.skipValidate && found.tool.input_schema) {
      const issues = validateAgainstSchema(call.input ?? {}, found.tool.input_schema);
      if (issues.length) {
        return {
          tool: call.tool,
          tool_id: found.tool.tool_id,
          ok: false,
          error: `Schema: ${formatValidationError(issues)}`,
        };
      }
    }
    try {
      const result = await client.execute(found.tool.tool_id, call.input ?? {});
      if (result.error) {
        return {
          tool: call.tool,
          tool_id: found.tool.tool_id,
          ok: false,
          error: result.error,
          duration_ms: result.duration_ms,
        };
      }
      return {
        tool: call.tool,
        tool_id: found.tool.tool_id,
        ok: true,
        output: result.output,
        duration_ms: result.duration_ms,
      };
    } catch (e) {
      return {
        tool: call.tool,
        tool_id: found.tool.tool_id,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  };

  let results: ResultRow[];
  if (parallel) {
    results = await Promise.all(calls.map(runOne));
  } else {
    results = [];
    for (const c of calls) results.push(await runOne(c));
  }

  const failed = results.filter((r) => !r.ok).length;
  const payload = {
    total: results.length,
    ok: results.length - failed,
    failed,
    parallel,
    results: redactDeep(results),
  };

  if (isJson()) {
    printJson(payload);
    if (failed) process.exitCode = 1;
    return;
  }

  printHuman(chalk.bold(`\nBatch execute (${results.length} calls, parallel=${parallel})\n`));
  for (const r of results) {
    const mark = r.ok ? chalk.green("\u2713") : chalk.red("\u2717");
    console.log(`${mark} ${r.tool}${r.duration_ms != null ? chalk.dim(` ${r.duration_ms}ms`) : ""}`);
    if (r.error) console.log(chalk.red(`    ${r.error}`));
    else if (r.output !== undefined) {
      const shown = redactDeep(r.output);
      const text = typeof shown === "string" ? shown : JSON.stringify(shown);
      console.log(chalk.dim(`    ${text.slice(0, 200)}${text.length > 200 ? "\u2026" : ""}`));
    }
  }
  if (failed) {
    fail(`${failed}/${results.length} failed`);
    process.exitCode = 1;
  } else {
    success(`All ${results.length} calls succeeded`);
  }
}
