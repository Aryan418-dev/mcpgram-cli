import chalk from "chalk";
import {
  getPublicConfig,
  loadConfig,
  setConfigKey,
  getConfigPath,
} from "../lib/config.js";
import { CliError, ExitCode } from "../lib/errors.js";
import { isJson, printJson, printHuman } from "../lib/output.js";
import { success } from "../utils/ui.js";

export async function configListCmd(): Promise<void> {
  const data = getPublicConfig();
  if (isJson()) {
    printJson(data);
    return;
  }
  printHuman(chalk.bold("MCPGRAM config"));
  printHuman(chalk.dim(`Path: ${getConfigPath()}`));
  for (const [k, v] of Object.entries(data)) {
    if (k === "configPath") continue;
    printHuman(`  ${k}: ${JSON.stringify(v)}`);
  }
}

export async function configGetCmd(key: string): Promise<void> {
  const data = getPublicConfig();
  if (!(key in data) && key !== "apiKey" && key !== "accessToken") {
    const c = loadConfig();
    if (key === "apiKey" || key === "accessToken") {
      const present = Boolean(c[key as "apiKey" | "accessToken"]);
      if (isJson()) {
        printJson({ key, set: present, value: present ? "[redacted]" : null });
        return;
      }
      printHuman(`${key}: ${present ? "[set]" : "[not set]"}`);
      return;
    }
    throw new CliError(`Unknown config key: ${key}`, ExitCode.USAGE);
  }
  const value = data[key];
  if (isJson()) {
    printJson({ key, value });
    return;
  }
  printHuman(`${key}=${JSON.stringify(value)}`);
}

export async function configSetCmd(key: string, value: string): Promise<void> {
  setConfigKey(key, value);
  if (isJson()) {
    printJson({ ok: true, key, value });
    return;
  }
  success(`Set ${key}`);
}
