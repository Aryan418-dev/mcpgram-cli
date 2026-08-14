/** Consistent CLI errors and process exit codes. */

export const ExitCode = {
  SUCCESS: 0,
  GENERAL: 1,
  USAGE: 2,
  AUTH: 3,
  NETWORK: 4,
  CONFIG: 5,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

export class CliError extends Error {
  constructor(
    message: string,
    public readonly code: ExitCodeValue = ExitCode.GENERAL,
    public readonly hint?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "CliError";
  }
}

export function isCliError(e: unknown): e is CliError {
  return e instanceof CliError;
}

export function toCliError(e: unknown): CliError {
  if (e instanceof CliError) return e;
  if (e && typeof e === "object" && "status" in e) {
    const status = Number((e as { status: number }).status);
    const body = (e as { body?: unknown }).body;
    const bodyError =
      body && typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: unknown }).error)
        : undefined;
    const msg = (e as { message?: string }).message || bodyError || `HTTP ${status}`;
    if (status === 401 || status === 403) {
      return new CliError(msg, ExitCode.AUTH, "Run: mcpgram login");
    }
    if (status >= 500 || status === 0) {
      return new CliError(msg, ExitCode.NETWORK, "Check network and MCPGRAM_API_URL");
    }
    return new CliError(msg, ExitCode.GENERAL);
  }
  if (e instanceof Error) {
    const m = e.message;
    if (/not authenticated|not logged in|invalid or revoked|missing.*authorization/i.test(m)) {
      return new CliError(m, ExitCode.AUTH, "Run: mcpgram login");
    }
    if (/ECONNREFUSED|ENOTFOUND|fetch failed|network|timed out/i.test(m)) {
      return new CliError(m, ExitCode.NETWORK, "Check network connectivity");
    }
    return new CliError(m, ExitCode.GENERAL);
  }
  return new CliError(String(e), ExitCode.GENERAL);
}

export function printError(err: CliError, debug = false): void {
  console.error(`✗ ${err.message}`);
  if (err.hint) console.error(`  → ${err.hint}`);
  if (debug && err.cause instanceof Error && err.cause.stack) {
    console.error(err.cause.stack);
  } else if (debug && err.stack) {
    console.error(err.stack);
  }
}

export function handleCommandError(e: unknown, opts?: { debug?: boolean; json?: boolean }): never {
  const err = toCliError(e);
  if (opts?.json) {
    process.stdout.write(
      JSON.stringify({
        ok: false,
        error: err.message,
        code: err.code,
        hint: err.hint,
      }) + "\n"
    );
  } else {
    printError(err, opts?.debug);
  }
  process.exit(err.code);
}
