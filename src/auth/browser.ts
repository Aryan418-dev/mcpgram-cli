/**
 * Browser Authorization Code + PKCE for MCPGRAM CLI (default login).
 *
 * Flow:
 * 1. Discover OAuth AS metadata (RFC 8414)
 * 2. Dynamic Client Registration (RFC 7591) for loopback redirect
 * 3. Open browser to /authorize with S256 PKCE
 * 4. Local 127.0.0.1 server receives ?code=
 * 5. Exchange code at /token
 */

import http from "node:http";
import { URL } from "node:url";
import open from "open";
import { generateCodeChallenge, generateCodeVerifier, generateState } from "../utils/pkce.js";
import { MCP_SERVER_ORIGIN, APP_URL } from "../lib/constants.js";
import { loadConfig, saveConfig } from "../lib/config.js";
import chalk from "chalk";

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

async function fetchAsMetadata(base: string): Promise<AsMetadata | null> {
  const roots = [base.replace(/\/$/, "")];
  // Also try APP_URL only if different (some deploys host AS on the app)
  const app = APP_URL.replace(/\/$/, "");
  if (app && app !== roots[0]) roots.push(app);

  for (const root of roots) {
    const urls = [
      `${root}/.well-known/oauth-authorization-server`,
      `${root}/.well-known/openid-configuration`,
    ];
    for (const u of urls) {
      try {
        const res = await fetch(u, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) continue;
        const json = (await res.json()) as AsMetadata;
        if (json.authorization_endpoint && json.token_endpoint) {
          // Normalize relative endpoints against root
          const abs = (ep: string) =>
            ep.startsWith("http") ? ep : `${root}${ep.startsWith("/") ? ep : `/${ep}`}`;
          return {
            ...json,
            authorization_endpoint: abs(json.authorization_endpoint),
            token_endpoint: abs(json.token_endpoint),
            registration_endpoint: json.registration_endpoint
              ? abs(json.registration_endpoint)
              : undefined,
          };
        }
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

async function registerClient(
  registrationEndpoint: string,
  redirectUri: string
): Promise<{ client_id: string }> {
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
    /* keep empty */
  }
  if (!res.ok || !json.client_id) {
    throw new Error(
      json.error_description ||
        json.error ||
        `DCR failed (${res.status}): ${text.slice(0, 240)}`
    );
  }
  return { client_id: json.client_id };
}

function htmlPage(title: string, body: string, ok: boolean): string {
  const color = ok ? "#cffe25" : "#ef4444";
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#fafafa;
    display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px}
  .card{background:#171717;border:1px solid #262626;border-radius:16px;padding:2rem 2.25rem;
    max-width:420px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.45)}
  h1{font-size:1.2rem;margin:0 0 .75rem;color:${color}}
  p{color:#a3a3a3;line-height:1.55;margin:0;font-size:.95rem}
  .logo{font-weight:700;letter-spacing:.06em;margin-bottom:1.25rem;color:#fff;font-size:.85rem}
</style></head>
<body><div class="card">
  <div class="logo">MCPGRAM</div>
  <h1>${title}</h1>
  <p>${body}</p>
</div></body></html>`;
}

type Loopback = {
  port: number;
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
        if (settled) return;
        settled = true;
        res(c);
      };
      codeReject = (e) => {
        if (settled) return;
        settled = true;
        rej(e);
      };
    });

    const server = http.createServer((req, res) => {
      try {
        const u = new URL(req.url || "/", "http://127.0.0.1");
        // Accept /callback and / (some agents strip path)
        if (u.pathname !== "/callback" && u.pathname !== "/") {
          res.writeHead(404, { "Content-Type": "text/plain" });
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
              "Missing authorization code or state mismatch. Close this window and run mcpgram login again.",
              false
            )
          );
          codeReject(new Error("Invalid OAuth callback (code/state)"));
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          htmlPage(
            "Signed in",
            "You can close this window and return to the terminal.",
            true
          )
        );
        codeResolve(code);
      } catch (e) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Error");
        codeReject(e instanceof Error ? e : new Error(String(e)));
      }
    });

    server.on("error", reject);
    // Prefer fixed-ish high ports then ephemeral for firewall friendliness
    const tryListen = (port: number) => {
      server.listen(port, "127.0.0.1", () => {
        const addr = server.address();
        if (!addr || typeof addr === "string") {
          reject(new Error("Failed to bind loopback server"));
          return;
        }
        const p = addr.port;
        const redirectUri = `http://127.0.0.1:${p}/callback`;
        resolve({
          port: p,
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
    };
    // port 0 = ephemeral
    tryListen(0);
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

  const methods = meta.code_challenge_methods_supported ?? ["S256"];
  if (!methods.includes("S256") && methods.length > 0) {
    throw new Error(`Server does not support S256 PKCE (supports: ${methods.join(", ")})`);
  }

  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = generateState();

  const loop = await startLoopbackServer(state);
  const redirectUri = loop.redirectUri;

  let clientId =
    process.env.MCPGRAM_CLI_CLIENT_ID?.trim() ||
    loadConfig().oauthClientId?.trim() ||
    "";

  try {
    if (!clientId) {
      if (!meta.registration_endpoint) {
        throw new Error(
          "No registration_endpoint in AS metadata and MCPGRAM_CLI_CLIENT_ID is unset"
        );
      }
      const reg = await registerClient(meta.registration_endpoint, redirectUri);
      clientId = reg.client_id;
      try {
        saveConfig({ oauthClientId: clientId });
      } catch {
        /* non-fatal */
      }
    }

    const authUrl = new URL(meta.authorization_endpoint);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", "mcp offline_access openid profile email");
    // RFC 8707 resource indicator — MCP resource
    const resource = `${MCP_SERVER_ORIGIN.replace(/\/$/, "")}/mcp`;
    authUrl.searchParams.set("resource", resource);

    console.log("");
    console.log(chalk.bold("  Browser login (PKCE)"));
    console.log(chalk.dim("  Complete sign-in in your browser. Waiting for callback…"));
    console.log("");
    console.log(chalk.dim("  If the browser does not open, visit:"));
    console.log(`  ${chalk.cyan(authUrl.toString())}`);
    console.log("");
    console.log(chalk.dim(`  Loopback: ${redirectUri}`));
    console.log("");

    if (opts.openBrowser !== false) {
      try {
        await open(authUrl.toString());
      } catch {
        console.log(chalk.yellow("  Could not open browser automatically — use the URL above."));
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
      redirect_uri: redirectUri,
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
      /* keep */
    }

    if (!tokenRes.ok || !tokenJson.access_token) {
      // Client id may be stale (redirect uri port changed) — clear and hint retry
      if (tokenRes.status === 401 || tokenJson.error === "invalid_client") {
        try {
          saveConfig({ oauthClientId: undefined });
        } catch {
          /* ignore */
        }
      }
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
