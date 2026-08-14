/**
 * Ranked natural-language tool search (Composio-style).
 * Scores name, description, server, and token overlap.
 */

import type { ToolRow } from "../api/client.js";

export type RankedTool = {
  tool: ToolRow;
  server: string;
  serverStatus: string;
  score: number;
  reasons: string[];
};

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9_\s.-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

export function rankTools(
  query: string,
  servers: Array<{ name: string; status: string; tools: ToolRow[] }>
): RankedTool[] {
  const tokens = tokenize(query);
  const q = query.toLowerCase().trim();
  const results: RankedTool[] = [];

  for (const s of servers) {
    for (const t of s.tools) {
      const name = t.name.toLowerCase();
      const id = t.tool_id.toLowerCase();
      const desc = (t.description ?? "").toLowerCase();
      const hay = `${name} ${id} ${desc} ${s.name.toLowerCase()}`;
      let score = 0;
      const reasons: string[] = [];

      if (name === q || id === q) {
        score += 100;
        reasons.push("exact name");
      } else if (name.includes(q) || id.includes(q)) {
        score += 60;
        reasons.push("name contains query");
      }

      for (const tok of tokens) {
        if (name.includes(tok) || id.includes(tok)) {
          score += 15;
          reasons.push(`name:${tok}`);
        } else if (desc.includes(tok)) {
          score += 8;
          reasons.push(`desc:${tok}`);
        } else if (s.name.toLowerCase().includes(tok)) {
          score += 5;
          reasons.push(`server:${tok}`);
        }
      }

      if (s.status === "connected" || s.status === "active" || s.status === "ok") {
        score += 2;
      }

      if (score > 0 || (tokens.length === 0 && hay)) {
        if (tokens.length === 0) score = 1;
        results.push({
          tool: t,
          server: s.name,
          serverStatus: s.status,
          score,
          reasons: [...new Set(reasons)].slice(0, 5),
        });
      }
    }
  }

  results.sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name));
  return results;
}

export function suggestPlan(query: string, ranked: RankedTool[]): string[] {
  const plan: string[] = [];
  if (!ranked.length) {
    plan.push(`No tools matched "${query}". Connect apps: mcpgram link <app>`);
    plan.push("Browse catalog: mcpgram marketplace search <query>");
    return plan;
  }
  const top = ranked[0];
  plan.push(`Best match: ${top.tool.name} (${top.server})`);
  plan.push(`Inspect schema: mcpgram execute ${top.tool.name} --schema`);
  plan.push(`Run: mcpgram execute ${top.tool.name} --input '{"...": "..."}'`);
  if (ranked.length > 1) {
    plan.push(`Alternatives: ${ranked.slice(1, 4).map((r) => r.tool.name).join(", ")}`);
  }
  return plan;
}
