import chalk from "chalk";
import { loginCmd } from "./auth.js";
import { scanCmd, setupCmd } from "./agents.js";
import { doctorCmd } from "./doctor.js";
import { isAuthenticated } from "../auth/token.js";
import { heading, success } from "../utils/ui.js";

/**
 * Zero-friction path: login → detect agents → configure → doctor.
 */
export async function onboardCmd(): Promise<void> {
  heading("🚀 MCPGRAM onboard");
  console.log("This will: login → scan agents → configure → health check\n");

  if (!isAuthenticated()) {
    await loginCmd({});
    if (!isAuthenticated()) {
      process.exitCode = 1;
      return;
    }
  } else {
    success("Already authenticated");
  }

  await scanCmd();
  await setupCmd(undefined, { all: true });
  await doctorCmd();

  console.log(chalk.bold("\nSummary"));
  console.log("  Install:   done");
  console.log("  Login:     done");
  console.log("  Agents:    configured (detected)");
  console.log(chalk.dim("\nRestart Claude Code / Cursor / Codex to load tools."));
  console.log(chalk.dim("Connect apps: mcpgram app connect  or open the dashboard."));
}
