import { spawn } from "node:child_process";
import chalk from "chalk";
import { success, fail, info } from "../utils/ui.js";

export async function updateCmd(): Promise<void> {
  info("Updating MCPGRAM CLI…");
  const npm = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["install", "-g", "@mcpgram/cli@latest"],
    { stdio: "inherit" }
  );
  npm.on("exit", (code) => {
    if (code === 0) {
      success("Updated to latest @mcpgram/cli");
      return;
    }
    const base = process.env.MCPGRAM_INSTALL_BASE || "https://mcpgram.vercel.app";
    console.log(chalk.dim("npm update failed; trying install script…"));
    const child = spawn("bash", ["-c", `curl -fsSL ${base}/install | bash`], {
      stdio: "inherit",
    });
    child.on("exit", (c) => {
      if (c === 0) success("Updated via install script");
      else {
        fail("Update failed");
        process.exitCode = c ?? 1;
      }
    });
  });
}
