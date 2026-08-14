/**
 * Example MCPGRAM workflow script.
 * Run: mcpgram run-script examples/hello-workflow.mjs
 *
 * export default async function (helpers) { ... }
 * Helpers: search, execute, link, tools, sleep, client, redact, log
 */
export default async function ({ search, execute, link, tools, log }) {
  log("MCPGRAM workflow start");

  const all = await tools();
  log(`Workspace tools: ${all.length}`);

  const hits = await search("github", { limit: 5 });
  log(
    "Top search hits:",
    hits.map((h) => ({ id: h.tool.tool_id, name: h.tool.name, score: h.score }))
  );

  // Uncomment to connect / run:
  // await link("github", { wait: true, timeoutMs: 90_000 });
  // if (hits[0]) {
  //   const result = await execute(hits[0].tool.tool_id, {});
  //   log(result);
  // }

  return { toolCount: all.length, searchHits: hits.length };
}
