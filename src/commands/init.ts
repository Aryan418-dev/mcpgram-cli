import fs from "node:fs";
import path from "node:path";
import { isJson, isYes, printJson, printHuman } from "../lib/output.js";
import { success, warn } from "../utils/ui.js";

export async function initCmd(name?: string): Promise<void> {
  const projectName = name || "my-mcp-server";
  const dir = path.resolve(process.cwd(), projectName);

  if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0 && !isYes()) {
    warn(`Directory ${dir} is not empty. Re-run with --yes to overwrite missing files only.`);
  }

  fs.mkdirSync(dir, { recursive: true });

  const files: Record<string, string> = {
    "mcpgram.json":
      JSON.stringify(
        {
          name: projectName,
          version: "0.1.0",
          mcp: { entry: "./server.js", transport: "stdio" },
          tools: [],
        },
        null,
        2
      ) + "\n",
    "package.json":
      JSON.stringify(
        {
          name: projectName,
          version: "0.1.0",
          type: "module",
          main: "server.js",
          scripts: { start: "node server.js" },
        },
        null,
        2
      ) + "\n",
    "server.js": `#!/usr/bin/env node
/**
 * Minimal MCP server scaffold for ${projectName}.
 * Replace with a real MCP SDK implementation.
 */
console.log(JSON.stringify({ jsonrpc: "2.0", result: { tools: [] } }));
`,
    ".env.example": `MCPGRAM_API_KEY=
MCPGRAM_API_URL=https://mcpgram.vercel.app
`,
    "README.md": `# ${projectName}

Scaffolded by mcpgram init.

## Develop

\`\`\`bash
npm start
\`\`\`

## Connect to MCPGRAM

\`\`\`bash
mcpgram servers connect <your-public-mcp-url> --name ${projectName}
\`\`\`
`,
  };

  const written: string[] = [];
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    if (fs.existsSync(p) && !isYes()) {
      warn(`Skip existing ${rel}`);
      continue;
    }
    fs.writeFileSync(p, content, { mode: rel.endsWith(".js") ? 0o755 : 0o644 });
    written.push(rel);
  }

  if (isJson()) {
    printJson({ ok: true, dir, written });
    return;
  }
  success(`Initialized ${projectName}`);
  printHuman(`  ${dir}`);
  for (const w of written) printHuman(`  + ${w}`);
}
