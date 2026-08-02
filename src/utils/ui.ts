import chalk from "chalk";
import ora, { type Ora } from "ora";

export function success(msg: string): void {
  console.log(chalk.green(`✓ ${msg}`));
}

export function fail(msg: string): void {
  console.error(chalk.red(`✗ ${msg}`));
}

export function warn(msg: string): void {
  console.log(chalk.yellow(`⚠ ${msg}`));
}

export function info(msg: string): void {
  console.log(chalk.cyan(`→ ${msg}`));
}

export function dim(msg: string): void {
  console.log(chalk.dim(msg));
}

export function heading(msg: string): void {
  console.log(chalk.bold(`\n${msg}\n`));
}

export function spinner(text: string): Ora {
  return ora({ text, color: "cyan" }).start();
}

export function exitError(msg: string, code = 1): never {
  fail(msg);
  process.exit(code);
}
