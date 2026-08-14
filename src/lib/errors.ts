/** CLI exit codes for scripting/CI */
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
    const msg = e instanceof Error ? e.message : String(e);
    if (status === 401 || status === 403) {
      return new CliError(msg, ExitCode.AUTH, "Run: mcpgram login");
    }
    if (status === 0 || status >= 500 || Number.isNaN(status)) {
      return new CliError(msg, ExitCode.NETWORK, "Check network / MCPGRAM_API_URL");
    }
  }
  if (e instanceof Error) return new CliError(e.message, ExitCode.GENERAL);
  return new CliError(String(e), ExitCode.GENERAL);
}
