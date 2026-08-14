/**
 * mcpgram run-script <file> — multi-step TypeScript/JS workflows (Composio `run`).
 *
 * Example (workflow.mjs):
 *
 *   export default async function ({ search, execute, link, log }) {
 *     const hits = await search("list github issues");
 *     log(hits.slice(0, 3));
 *     const r = await execute(hits[0].tool.tool_id, { state: "open" });
 *     log(r);
 *   }
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import chalk from "chalk";
import { CliError, ExitCode } from "../lib/errors.js";
import { isJson, printJson, printHuman } from "../lib/output.js";
import { createScriptHelpers, runUserScript } from "../lib/script-runtime.js";
import { success, fail } from "../utils/ui.js";

function resolveScriptPath(file: string): string {
  const abs = path.resolve(process.cwd(), file);
  if (!fs.existsSync(abs)) {
    throw new CliError(`Script not found: ${abs}`, ExitCode.USAGE);
  }
  if (!fs.statSync(abs).isFile()) {
    throw new CliError(`Not a file: ${abs}`, ExitCode.USAGE);
  }
  return abs;
}

function runtimeModuleUrl(): string {
  // This file compiles to dist/commands/run-script.js → ../lib/script-runtime.js
  return pathToFileURL(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../lib/script-runtime.js")
  ).href;
}

/** Bootstrap runner executed by tsx for .ts scripts */
function buildTsxBootstrap(scriptPath: string): string {
  const rt = runtimeModuleUrl();
  return `import { createScriptHelpers, runUserScript } from ${JSON.stringify(rt)};
const helpers = createScriptHelpers();
const result = await runUserScript(${JSON.stringify(scriptPath)}, helpers);
if (result !== undefined) {
  console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2));
}
`;
}

async function runWithTsx(scriptPath: string): Promise<number> {
  const tmp = path.join(
    path.dirname(scriptPath),
    `.mcpgram-run-${process.pid}-${Date.now()}.mjs`
  );
  fs.writeFileSync(tmp, buildTsxBootstrap(scriptPath), "utf8");
  return new Promise((resolve) => {
    const child = spawn("npx", ["--yes", "tsx", tmp], {
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });
    const cleanup = () => {
      try {
        fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    };
    child.on("close", (code) => {
      cleanup();
      resolve(code ?? 1);
    });
    child.on("error", () => {
      cleanup();
      resolve(1);
    });
  });
}

export async function runScriptCmd(
  file: string,
  opts: { dryRun?: boolean } = {}
): Promise<void> {
  const abs = resolveScriptPath(file);
  const ext = path.extname(abs).toLowerCase();

  if (opts.dryRun) {
    const helpers = createScriptHelpers();
    if (isJson()) {
      printJson({
        ok: true,
        dryRun: true,
        file: abs,
        helpers: Object.keys(helpers),
      });
    } else {
      printHuman(`Would run script: ${abs}`);
      printHuman(`Injected helpers: ${Object.keys(helpers).join(", ")}`);
    }
    return;
  }

  if (ext === ".mjs" || ext === ".js" || ext === ".cjs") {
    const helpers = createScriptHelpers();
    try {
      if (!isJson()) console.log(chalk.dim(`Running ${abs}…`));
      const result = await runUserScript(abs, helpers);
      if (isJson()) {
        printJson({ ok: true, file: abs, result: result ?? null });
      } else {
        success(`Script finished: ${path.basename(abs)}`);
        if (result !== undefined) {
          console.log(
            typeof result === "string" ? result : JSON.stringify(result, null, 2)
          );
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (isJson()) printJson({ ok: false, error: msg });
      else fail(msg);
      process.exitCode = 1;
    }
    return;
  }

  if (ext === ".ts" || ext === ".tsx") {
    if (!isJson()) console.log(chalk.dim(`Running TypeScript via tsx: ${abs}…`));
    const code = await runWithTsx(abs);
    if (code !== 0) {
      throw new CliError(
        "TypeScript script failed. Ensure network access for `npx tsx`, or convert the script to .mjs.",
        ExitCode.GENERAL
      );
    }
    return;
  }

  throw new CliError(
    `Unsupported script type: ${ext || "(none)"}. Use .mjs, .js, or .ts`,
    ExitCode.USAGE
  );
}
