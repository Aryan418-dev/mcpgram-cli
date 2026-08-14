/**
 * Composio-parity command registration (search / execute / link / install-skill).
 */

import type { Command } from "commander";
import { searchCmd } from "./commands/search.js";
import { executeCmd } from "./commands/execute.js";
import { linkCmd, unlinkCmd } from "./commands/link.js";
import { installSkillsCmd } from "./commands/skills.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Wrap = (fn: (...args: any[]) => Promise<void> | void) => (...args: any[]) => Promise<void>;

export function registerParityCommands(program: Command, wrap: Wrap): void {
  program
    .command("search <query>")
    .description("Natural-language tool search (ranked)")
    .option("--limit <n>", "Max results", "12")
    .action(wrap(async (query: string, opts: { limit?: string }) => searchCmd(query, opts)));

  program
    .command("execute [tool]")
    .description("Execute a tool (alias of run) with --schema / --dry-run / --batch")
    .option("--input <json>", "JSON arguments")
    .option("--schema", "Show input schema only")
    .option("--get-schema", "Alias of --schema")
    .option("--dry-run", "Validate input, do not execute")
    .option("--dry", "Alias of --dry-run")
    .option("--batch <file>", "Execute batch JSON file of {tool,input}[]")
    .option("--no-validate", "Skip JSON Schema validation")
    .option("--sequential", "Run batch calls sequentially (default parallel)")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(
      wrap(
        async (
          tool: string | undefined,
          opts: {
            input?: string;
            schema?: boolean;
            getSchema?: boolean;
            dryRun?: boolean;
            dry?: boolean;
            batch?: string;
            validate?: boolean;
            sequential?: boolean;
          }
        ) => {
          await executeCmd(
            opts.batch ? undefined : tool,
            {
              input: opts.input,
              schema: Boolean(opts.schema || opts.getSchema),
              dryRun: Boolean(opts.dryRun || opts.dry),
              batch: opts.batch,
              noValidate: opts.validate === false,
              sequential: Boolean(opts.sequential),
            },
            tool ? process.argv.slice(process.argv.indexOf(tool) + 1) : process.argv
          );
        }
      )
    );

  program
    .command("link [app]")
    .description("Connect an app via browser OAuth (dashboard)")
    .option("--wait", "Poll until app tools appear")
    .option("--timeout <ms>", "Wait timeout ms (default 120000)")
    .action(
      wrap(async (app: string | undefined, opts: { wait?: boolean; timeout?: string }) =>
        linkCmd(app, opts)
      )
    );

  program
    .command("unlink [app]")
    .description("Disconnect app guidance (opens dashboard)")
    .action(wrap(async (app?: string) => unlinkCmd(app)));

  program
    .command("install-skill")
    .description("Install MCPGRAM CLI skill for Claude Code / Codex")
    .option("--claude", "Claude Code skill only")
    .option("--codex", "Codex skill only")
    .option("--project", "Also write project .claude/skills")
    .option("--all", "Claude + Codex")
    .action(
      wrap(async (opts: { claude?: boolean; codex?: boolean; project?: boolean; all?: boolean }) =>
        installSkillsCmd(opts)
      )
    );
}
