/**
 * Injected helpers for `mcpgram run-script` (Composio-style composio run).
 * Scripts export default async function (helpers) or use globalThis.__mcpgram.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";
import open from "open";
import { McpgramClient, type ExecuteResult, type ToolRow } from "../api/client.js";
import { APP_URL } from "./constants.js";
import { rankTools, type RankedTool } from "./search.js";
import { redactDeep } from "./redact.js";
import { validateAgainstSchema, formatValidationError } from "./validate.js";

export type ScriptHelpers = {
  /** Ranked natural-language tool search */
  search: (query: string, opts?: { limit?: number }) => Promise<RankedTool[]>;
  /** Resolve tool by name/id and execute */
  execute: (
    tool: string,
    input?: Record<string, unknown>,
    opts?: { validate?: boolean }
  ) => Promise<ExecuteResult>;
  /** Open dashboard OAuth connect for an app; optional wait until tools appear */
  link: (
    app: string,
    opts?: { wait?: boolean; timeoutMs?: number; openBrowser?: boolean }
  ) => Promise<{ url: string; connected?: boolean }>;
  /** Flat list of tools */
  tools: (serverFilter?: string) => Promise<Array<ToolRow & { server: string }>>;
  /** Sleep helper for polling */
  sleep: (ms: number) => Promise<void>;
  /** Authenticated API client (advanced) */
  client: McpgramClient;
  /** Redact secrets from objects before logging */
  redact: (value: unknown) => unknown;
  log: (...args: unknown[]) => void;
};

export function createScriptHelpers(): ScriptHelpers {
  const client = new McpgramClient();

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  async function search(query: string, opts?: { limit?: number }): Promise<RankedTool[]> {
    const data = await client.listTools();
    const ranked = rankTools(query, data.servers);
    const limit = opts?.limit ?? 12;
    return ranked.slice(0, limit);
  }

  async function execute(
    tool: string,
    input: Record<string, unknown> = {},
    opts?: { validate?: boolean }
  ): Promise<ExecuteResult> {
    const found = await client.findTool(tool);
    if (!found) {
      return { error: `Tool not found: ${tool}. Try helpers.search("${tool}")` };
    }
    const schema = found.tool.input_schema;
    if (opts?.validate !== false && schema && typeof schema === "object") {
      const v = validateAgainstSchema(input, schema as Record<string, unknown>);
      if (!v.ok) {
        return { error: formatValidationError(v) };
      }
    }
    const result = await client.execute(found.tool.tool_id, input);
    return redactDeep(result) as ExecuteResult;
  }

  async function link(
    app: string,
    opts?: { wait?: boolean; timeoutMs?: number; openBrowser?: boolean }
  ): Promise<{ url: string; connected?: boolean }> {
    const slug = app.trim().toLowerCase();
    const url = `${APP_URL.replace(/\/$/, "")}/connect?app=${encodeURIComponent(slug)}`;
    if (opts?.openBrowser !== false) {
      try {
        await open(url);
      } catch {
        /* headless */
      }
    }

    if (!opts?.wait) {
      return { url };
    }

    const timeout = opts.timeoutMs ?? 120_000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const data = await client.listTools();
        const q = slug;
        const hit = data.servers.some(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.tools.some(
              (t) =>
                t.name.toLowerCase().includes(q) || t.tool_id.toLowerCase().includes(q)
            )
        );
        if (hit) return { url, connected: true };
      } catch {
        /* keep polling */
      }
      await sleep(2500);
    }
    return { url, connected: false };
  }

  async function tools(serverFilter?: string) {
    const data = await client.listTools(serverFilter);
    return data.servers.flatMap((s) =>
      s.tools.map((t) => ({ ...t, server: s.name }))
    );
  }

  return {
    search,
    execute,
    link,
    tools,
    sleep,
    client,
    redact: redactDeep,
    log: (...args: unknown[]) => {
      console.log(
        ...args.map((a) =>
          typeof a === "object" && a !== null ? redactDeep(a) : a
        )
      );
    },
  };
}

/**
 * Load and run a user script.
 * Supported forms:
 * 1. export default async function (helpers) { ... }
 * 2. export async function main(helpers) { ... }
 * 3. top-level await using globalThis.__mcpgram (set before import)
 * 4. CommonJS module.exports = async (helpers) => ...
 */
export async function runUserScript(
  absolutePath: string,
  helpers: ScriptHelpers
): Promise<unknown> {
  (globalThis as unknown as { __mcpgram: ScriptHelpers }).__mcpgram = helpers;

  const href = pathToFileURL(path.resolve(absolutePath)).href;
  // Cache-bust so re-runs pick up edits during agent sessions
  const mod = await import(`${href}?t=${Date.now()}`);

  const candidate =
    typeof mod.default === "function"
      ? mod.default
      : typeof mod.main === "function"
        ? mod.main
        : typeof mod.run === "function"
          ? mod.run
          : null;

  if (candidate) {
    return await candidate(helpers);
  }

  return mod.result ?? mod.default ?? undefined;
}
