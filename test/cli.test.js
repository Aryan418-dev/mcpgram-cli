import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = path.join(root, "dist", "index.js");

function run(args, env = {}) {
  return spawnSync(process.execPath, [bin, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
      MCPGRAM_API_KEY: env.MCPGRAM_API_KEY ?? "",
      MCPGRAM_TOKEN: env.MCPGRAM_TOKEN ?? "",
    },
  });
}

test("mcpgram --version prints 0.4.0", () => {
  const r = run(["--version"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout.trim(), /0\.4\.0/);
});

test("mcpgram version command", () => {
  const r = run(["version"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /0\.4\.0/);
});

test("mcpgram --help lists core commands", () => {
  const r = run(["--help"]);
  assert.equal(r.status, 0);
  for (const cmd of [
    "login", "whoami", "logout", "servers", "tools", "run",
    "doctor", "config", "init", "deploy", "logs", "keys", "marketplace",
  ]) {
    assert.match(r.stdout, new RegExp(cmd));
  }
});

test("whoami without auth fails cleanly", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "mcpgram-test-home-"));
  const r = run(["whoami", "--json"], { HOME: home });
  assert.notEqual(r.status, 0);
  assert.ok((r.stdout || r.stderr || "").length > 0);
});

test("config list --json returns object", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "mcpgram-test-cfg-"));
  const r = run(["config", "list", "--json"], { HOME: home });
  assert.equal(r.status, 0);
  const j = JSON.parse(r.stdout);
  assert.equal(typeof j, "object");
  assert.ok("authenticated" in j);
  assert.equal(j.authenticated, false);
});

test("config set and get", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "mcpgram-test-set-"));
  const set = run(["config", "set", "outputFormat", "json"], { HOME: home });
  assert.equal(set.status, 0);
  const get = run(["config", "get", "outputFormat", "--json"], { HOME: home });
  assert.equal(get.status, 0);
  const j = JSON.parse(get.stdout);
  assert.equal(j.value, "json");
});

test("doctor --json returns checks", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "mcpgram-test-doc-"));
  const r = run(["doctor", "--json"], { HOME: home });
  const j = JSON.parse(r.stdout);
  assert.ok(Array.isArray(j.checks));
  assert.equal(j.version, "0.4.0");
});

test("servers without auth fails", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "mcpgram-test-srv-"));
  const r = run(["servers", "list", "--json"], { HOME: home });
  assert.notEqual(r.status, 0);
});

test("tools without auth fails", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "mcpgram-test-tools-"));
  const r = run(["tools", "list", "--json"], { HOME: home });
  assert.notEqual(r.status, 0);
});

test("init scaffolds project", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mcpgram-init-"));
  const r = run(["init", "demo-mcp", "--yes", "--json"], {
    HOME: fs.mkdtempSync(path.join(os.tmpdir(), "mcpgram-home-")),
    cwd: tmp,
  });
  // spawnSync does not take cwd in env — use process.chdir via status check on path
  const r2 = spawnSync(process.execPath, [bin, "init", "demo-mcp", "--yes", "--json"], {
    encoding: "utf8",
    cwd: tmp,
    env: { ...process.env, HOME: fs.mkdtempSync(path.join(os.tmpdir(), "mcpgram-h-")) },
  });
  assert.equal(r2.status, 0);
  assert.ok(fs.existsSync(path.join(tmp, "demo-mcp", "mcpgram.json")));
});

test("deploy without mcpgram.json fails config", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mcpgram-deploy-"));
  const r = spawnSync(process.execPath, [bin, "deploy", "--json"], {
    encoding: "utf8",
    cwd: tmp,
    env: { ...process.env, HOME: fs.mkdtempSync(path.join(os.tmpdir(), "mcpgram-h2-")) },
  });
  assert.notEqual(r.status, 0);
});

test("marketplace search returns json", () => {
  const r = run(["marketplace", "search", "slack", "--json"]);
  assert.equal(r.status, 0);
  const j = JSON.parse(r.stdout);
  assert.equal(j.ok, true);
  assert.ok(j.url);
});
