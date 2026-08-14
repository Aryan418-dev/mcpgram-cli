import chalk from "chalk";
import { CliError, ExitCode, type ExitCodeValue, toCliError } from "./errors.js";

export type GlobalOpts = {
  json?: boolean;
  debug?: boolean;
  quiet?: boolean;
  yes?: boolean;
};

let globalOpts: GlobalOpts = {};

export function setGlobalOpts(opts: GlobalOpts): void {
  globalOpts = { ...globalOpts, ...opts };
}

export function getGlobalOpts(): GlobalOpts {
  return globalOpts;
}

export function isJson(): boolean {
  return Boolean(globalOpts.json);
}

export function isDebug(): boolean {
  return Boolean(globalOpts.debug || process.env.MCPGRAM_DEBUG === "1");
}

export function isQuiet(): boolean {
  return Boolean(globalOpts.quiet);
}

export function isYes(): boolean {
  return Boolean(globalOpts.yes);
}

/** Print only valid JSON to stdout (no decorations). */
export function printJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

export function printHuman(lines: string | string[]): void {
  if (isQuiet() || isJson()) return;
  const arr = Array.isArray(lines) ? lines : [lines];
  for (const l of arr) console.log(l);
}

export function handleCommandError(e: unknown): never {
  const err = toCliError(e);
  if (isJson()) {
    printJson({
      ok: false,
      error: err.message,
      code: err.code,
      hint: err.hint,
    });
  } else {
    console.error(chalk.red(`✗ ${err.message}`));
    if (err.hint) console.error(chalk.dim(`  → ${err.hint}`));
    if (isDebug() && err.cause) {
      console.error(chalk.dim(String(err.cause instanceof Error ? err.cause.stack : err.cause)));
    } else if (isDebug() && e instanceof Error && e.stack) {
      console.error(chalk.dim(e.stack));
    }
  }
  process.exit(err.code);
}

export function exitOk(code: ExitCodeValue = ExitCode.SUCCESS): never {
  process.exit(code);
}

export { CliError, ExitCode };
