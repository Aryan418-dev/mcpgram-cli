import chalk from "chalk";
import {
  getConfigPath,
  getPublicConfig,
  setConfigValue,
  PUBLIC_CONFIG_KEYS,
} from "../lib/config.js";
import { isJson, printJson } from "../lib/output.js";
import { CliError, ExitCode } from "../lib/errors.js";

export async function configListCmd(): Promise<void> {
  const data = getPublicConfig();
  if (isJson()) {
    printJson({ ok: true, path: getConfigPath(), config: data });
    return;
  }
  console.log(chalk.bold("\nMCPGRAM config\n"));
  console.log(`  Path: ${getConfigPath()}\n`);
  for (const [k, v] of Object.entries(data)) {
    console.log(`  ${k.padEnd(22)} ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
  }
  console.log("");
}

export async function configGetCmd(key: string): Promise<void> {
  const data = getPublicConfig();
  if (!(key in data) && !(PUBLIC_CONFIG_KEYS as readonly string[]).includes(key)) {
    throw new CliError(`Unknown config key: ${key}`, ExitCode.USAGE, `Try: ${PUBLIC_CONFIG_KEYS.join(", ")}`);
  }
  const value = (data as Record<string, unknown>)[key];
  if (isJson()) {
    printJson({ ok: true, key, value: value ?? null });
    return;
  }
  if (value === undefined) console.log(chalk.dim("(unset)"));
  else if (typeof value === "object") console.log(JSON.stringify(value, null, 2));
  else console.log(String(value));
}

export async function configSetCmd(key: string, value: string): Promise<void> {
  try {
    setConfigValue(key, value);
  } catch (e) {
    throw new CliError(e instanceof Error ? e.message : String(e), ExitCode.USAGE);
  }
  if (isJson()) {
    printJson({ ok: true, key, value });
    return;
  }
  console.log(chalk.green(`✓ Set ${key} = ${value}`));
}

export async function configCmd(): Promise<void> {
  await configListCmd();
}
