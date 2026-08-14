export type GlobalOpts = {
  json?: boolean;
  debug?: boolean;
  quiet?: boolean;
  yes?: boolean;
};

let globals: GlobalOpts = {};

export function setGlobalOpts(opts: GlobalOpts): void {
  globals = { ...globals, ...opts };
}

export function getGlobalOpts(): GlobalOpts {
  return globals;
}

export function isJson(): boolean {
  return Boolean(globals.json);
}

export function isDebug(): boolean {
  return Boolean(globals.debug) || process.env.MCPGRAM_DEBUG === "1";
}

export function isQuiet(): boolean {
  return Boolean(globals.quiet);
}

export function isYes(): boolean {
  return Boolean(globals.yes) || process.env.CI === "true";
}

export function printJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

export function out(msg: string): void {
  if (isJson() || isQuiet()) return;
  console.log(msg);
}

export function errOut(msg: string): void {
  if (isQuiet() && !isDebug()) return;
  console.error(msg);
}
