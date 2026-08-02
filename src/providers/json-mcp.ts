import fs from "node:fs";
import path from "node:path";
import type { McpServerEntry } from "./types.js";
import { SERVER_KEY } from "../lib/constants.js";

/** Shared helpers for clients that store mcpServers in a JSON file. */

export function readJsonFile(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function writeJsonFile(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function mergeMcpServers(
  filePath: string,
  entry: McpServerEntry,
  key = SERVER_KEY
): { configPath: string; previous: unknown } {
  const doc = readJsonFile(filePath);
  const servers =
    (doc.mcpServers as Record<string, unknown> | undefined) ??
    (doc.servers as Record<string, unknown> | undefined) ??
    {};
  const previous = servers[key];
  const payload: Record<string, unknown> = {};
  if (entry.url) {
    payload.url = entry.url;
    if (entry.headers) payload.headers = entry.headers;
  } else if (entry.command) {
    payload.command = entry.command;
    if (entry.args) payload.args = entry.args;
    if (entry.env) payload.env = entry.env;
  }
  servers[key] = payload;
  if ("servers" in doc && !("mcpServers" in doc)) {
    doc.servers = servers;
  } else {
    doc.mcpServers = servers;
    delete (doc as { servers?: unknown }).servers;
  }
  writeJsonFile(filePath, doc);
  return { configPath: filePath, previous };
}

export function removeMcpServer(filePath: string, key = SERVER_KEY): boolean {
  if (!fs.existsSync(filePath)) return false;
  const doc = readJsonFile(filePath);
  const rootKey = "mcpServers" in doc ? "mcpServers" : "servers" in doc ? "servers" : null;
  if (!rootKey) return false;
  const servers = doc[rootKey] as Record<string, unknown>;
  if (!servers || !(key in servers)) return false;
  delete servers[key];
  writeJsonFile(filePath, doc);
  return true;
}

export function getMcpEntry(filePath: string, key = SERVER_KEY): unknown | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  const doc = readJsonFile(filePath);
  const servers =
    (doc.mcpServers as Record<string, unknown> | undefined) ??
    (doc.servers as Record<string, unknown> | undefined);
  return servers?.[key];
}
