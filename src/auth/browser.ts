/**
 * Browser Authorization Code + PKCE for MCPGRAM CLI (default login).
 */

import http from "node:http";
import { URL } from "node:url";
import open from "open";
import chalk from "chalk";
import { generateCodeChallenge, generateCodeVerifier, generateState } from "../utils/pkce.js";
import { MCP_SERVER_ORIGIN, APP_URL } from "../lib/constants.js";

export type BrowserLoginResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scope?: string;
};

type AsMetadata = {
  issuer?: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  code_challenge_methods_supported?: string[];
};

function absUrl(root: string, ep: string): string {
  if (ep.startsWith("http://") || ep.startsWith("https://")) return ep;
  return `${root}${ep.startsWith("/") ? ep : `/${ep}`}`;
}

async function fetchAsMetadata(base: string): Promise<AsMetadata | null> {
  const roots = [base.replace(/\/$/, "")];
  const app = APP_URL.replace(/\/$/, "");
  if (app && app !== roots[0]) roots.push(app);

  for (const root of roots) {
    for (const path of [
      "/.well-known/oauth-authorization-server",
      "/.well-known/openid-configuration",
    ]) {
      try {
        const res = await fetch(`${root}${path}`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) continue;
        const json = (await res.json()) as AsMetadata;
        if (json.authorization_endpoint && json.token_endpoint) {
          return {
            ...json,
            authorization_endpoint: absUrl(root, json.authorization_endpoint),
            token_endpoint: absUrl(root, json.token_endpoint),
            registration_endpoint: json.registration_endpoint
              ? absUrl(root, json.registration_endpoint)
              : undefined,
          };
        }
      } catch {
        /* next */
      }
    }
  }
  return null;
}

async function registerClient(
  registrationEndpoint: string,
  redirectUri: string
): Promise<string> {
  const res = await fetch(registrationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_name: "MCPGRAM CLI",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      application_type: "native",
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let json: { client_id?: string; error?: string; error_description?: string } = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* ignore */
  }
  if (!res.ok || !json.client_id) {
    throw new Error(
      json.error_description ||
        json.error ||
        `DCR failed (${res.status}): ${text.slice(0, 240)}`
    );
  }
  return json.client_id;
}

function htmlPage(title: string, body: string, ok: boolean): string {
  const color = ok ? "#cffe25" : "#ef4444";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title>
<style>
body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#fafafa;display:flex;
align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px}
.card{background:#171717;border:1px solid #262626;border-radius:16px;padding:2rem;max-width:420px;text-align:center}
h1{font-size:1.2rem;margin:0 0 .75rem;color:${color}}p{color:#a3a3a3;line-height:1.55;margin:0}
.logo{font-weight:700;letter-spacing:.06em;margin-bottom:1.25rem}
</style></head><body><div class="card"><div class="logo">MCPGRAM</div>
<h1>${title}</h1><p>${body}</p></div></body></html>`;
}

type Loopback = {
  redirectUri: string;
  waitForCode: () => Promise<string>;
  close: () => void;
};

function startLoopbackServer(expectedState: string): Promise<Loopback> {
  return new Promise((resolve, reject) => {
    let codeResolve!: (c: string) => void;
    let codeReject!: (e: Error) => void;
    let settled = false;
    const codePromise = new Promise<string>((res, rej) => {
      codeResolve = (c) => {
        if (!settled) {
          settled = true;
          res(c);
        }
      };
      codeReject = (e) => {
        if (!settled) {
          settled = true;
          rej(e);
        }
      };
    });

    const server = http.createServer((req, res) => {
      try {
        const u = new URL(req.url || "/", "http://127.0.0.1");
        if (u.pathname !== "/callback" && u.pathname !== "/") {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        const code = u.searchParams.get("code");
        const state = u.searchParams.get("state");
        const err = u.searchParams.get("error");
        const errDesc = u.searchParams.get("error_description");
        if (err) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(htmlPage("Authorization failed", errDesc || err, false));
          codeReject(new Error(errDesc || err));
          return;
        }
        if (!code || state !== expectedState) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(
            htmlPage(
              "Invalid callback",
              "Missing code or state mismatch. Close this window and run mcpgram login again.",
              false
            )
          );
          codeReject(new Error("Invalid OAuth callback (code/state)"));
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          htmlPage("Signed in", "You can close this window and return to the terminal.", true)
        );
        codeResolve(code);
      } catch (e) {
        res.writeHead(500);
        res.end("Error");
        codeReject(e instanceof Error ? e : new Error(String(e)));
      }
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("Failed to bind loopback server"));
        return;
      }
      const redirectUri = `http://127.0.0.1:${addr.port}/callback`;
      resolve({
        redirectUri,
        waitForCode: () => codePromise,
        close: () => {
          try {
            server.close();
          } catch {
            /* ignore */
          }
        },
      });
    });
  });
}

export async function browserPkceLogin(opts: {
  openBrowser?: boolean;
  timeoutMs?: number;
}): Promise<BrowserLoginResult> {
  const meta = await fetchAsMetadata(MCP_SERVER_ORIGIN);
  if (!meta) {
    throw new Error(
      `OAuth metadata not found at ${MCP_SERVER_ORIGIN}. Check network or set MCPGRAM_MCP_URL.`
    );
  }

  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = generateState();
  const loop = await startLoopbackServer(state);

  try {
    // Always register for THIS redirect_uri (ephemeral port). Never reuse old client_id.
    let clientId = process.env.MCPGRAM_CLI_CLIENT_ID?.trim() || "";
    if (!clientId) {
      if (!meta.registration_endpoint) {
        throw new Error(
          "No registration_endpoint and MCPGRAM_CLI_CLIENT_ID is unset"
        );
      }
      clientId = await registerClient(meta.registration_endpoint, loop.redirectUri);
    }

    const authUrl = new URL(meta.authorization_endpoint);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", loop.redirectUri);
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", "mcp offline_access openid profile email");
    authUrl.searchParams.set(
      "resource",
      `${MCP_SERVER_ORIGIN.replace(/\/$/, "")}/mcp`
    );

    console.log("");
    console.log(chalk.bold("  Browser login (PKCE)"));
    console.log(chalk.dim("  Complete sign-in in your browser. Waiting for callback…"));
    console.log("");
    console.log(chalk.dim("  If the browser does not open, visit:"));
    console.log(`  ${chalk.cyan(authUrl.toString())}`);
    console.log("");
    console.log(chalk.dim(`  Callback: ${loop.redirectUri}`));
    console.log("");

    if (opts.openBrowser !== false) {
      try {
        await open(authUrl.toString());
      } catch {
        console.log(
          chalk.yellow("  Could not open browser automatically — use the URL above.")
        );
      }
    }

    const timeout = opts.timeoutMs ?? 5 * 60 * 1000;
    const code = await Promise.race([
      loop.waitForCode(),
      new Promise<string>((_, rej) =>
        setTimeout(
          () => rej(new Error("Login timed out after 5 minutes. Run mcpgram login again.")),
          timeout
        )
      ),
    ]);

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: loop.redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    });

    const tokenRes = await fetch(meta.token_endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(20_000),
    });

    const tokenText = await tokenRes.text();
    let tokenJson: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    } = {};
    try {
      tokenJson = tokenText ? JSON.parse(tokenText) : {};
    } catch {
      /* ignore */
    }

    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new Error(
        tokenJson.error_description ||
          tokenJson.error ||
          `Token exchange failed (${tokenRes.status}): ${tokenText.slice(0, 200)}`
      );
    }

    return {
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token,
      expiresIn: tokenJson.expires_in,
      tokenType: tokenJson.token_type || "Bearer",
      scope: tokenJson.scope,
    };
  } finally {
    loop.close();
  }
}
