/**
 * Browser Authorization Code + PKCE for MCPGRAM CLI.
 *
 * Flow:
 * 1. Discover OAuth AS metadata from MCP server (/.well-known/oauth-authorization-server)
 * 2. Dynamic Client Registration (DCR) if needed
 * 3. Open browser to /authorize with PKCE
 * 4. Local loopback server receives ?code=
 * 5. Exchange code for tokens at /token
 *
 * Reuses the same OAuth AS as Claude Desktop / MCP clients — unified identity.
 * If OAuth is unavailable, callers fall back to API-key login.
 */

import http from "node:http";
import { URL } from "node:url";
import open from "open";
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

async function fetchAsMetadata(base: string): Promise<AsMetadata | null> {
  const urls = [
    `${base}/.well-known/oauth-authorization-server`,
    `${base}/.well-known/oauth-authorization-server/mcp`,
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u, { headers: { Accept: "application/json" } });
      if (!res.ok) continue;
      const json = (await res.json()) as AsMetadata;
      if (json.authorization_endpoint && json.token_endpoint) return json;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function registerClient(
  registrationEndpoint: string,
  redirectUri: string
): Promise<{ client_id: string; client_secret?: string }> {
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
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`DCR failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { client_id: string; client_secret?: string };
  if (!json.client_id) throw new Error("DCR response missing client_id");
  return json;
}

function startLoopbackServer(
  expectedState: string
): Promise<{ port: number; code: Promise<string>; close: () => void }> {
  return new Promise((resolve, reject) => {
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
          res.end(htmlPage("Invalid callback", "Missing code or state mismatch.", false));
          codeReject(new Error("Invalid OAuth callback"));
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          htmlPage(
            "MCPGRAM CLI connected successfully",
            "You may now close this window and return to the terminal.",
            true
          )
        );
        codeResolve(code);
      } catch (e) {
        res.writeHead(500);
        res.end("Error");
        codeReject(e instanceof Error ? e : new Error(String(e)));
      }
    });

    let codeResolve: (c: string) => void;
    let codeReject: (e: Error) => void;
    const codePromise = new Promise<string>((res, rej) => {
      codeResolve = res;
      codeReject = rej;
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("Failed to bind loopback server"));
        return;
      }
      resolve({
        port: addr.port,
        code: codePromise,
        close: () => {
          try {
            server.close();
          } catch {
            /* ignore */
          }
        },
      });
    });
    server.on("error", reject);
  });
}

function htmlPage(title: string, body: string, ok: boolean): string {
  const color = ok ? "#22c55e" : "#ef4444";
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>${title}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#fafafa;
    display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .card{background:#171717;border:1px solid #262626;border-radius:12px;padding:2rem 2.5rem;
    max-width:420px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.4)}
  h1{font-size:1.25rem;margin:0 0 .75rem;color:${color}}
  p{color:#a3a3a3;line-height:1.5;margin:0}
  .logo{font-weight:700;letter-spacing:.04em;margin-bottom:1.25rem;color:#fff}
</style></head>
<body><div class="card">
  <div class="logo">MCPGRAM</div>
  <h1>${title}</h1>
  <p>${body}</p>
</div></body></html>`;
}

export async function browserPkceLogin(opts: {
  openBrowser?: boolean;
  timeoutMs?: number;
}): Promise<BrowserLoginResult> {
  const base = MCP_SERVER_ORIGIN;
  const meta = await fetchAsMetadata(base);
  if (!meta) {
    throw new Error(
      `OAuth metadata not found at ${base}. Use API key login or set MCPGRAM_MCP_URL.`
    );
  }

  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = generateState();

  const loop = await startLoopbackServer(state);
  const redirectUri = `http://127.0.0.1:${loop.port}/callback`;

  let clientId = process.env.MCPGRAM_CLI_CLIENT_ID;
  if (!clientId) {
    if (!meta.registration_endpoint) {
      loop.close();
      throw new Error("No registration_endpoint and MCPGRAM_CLI_CLIENT_ID not set");
    }
    const reg = await registerClient(meta.registration_endpoint, redirectUri);
    clientId = reg.client_id;
  }

  const authUrl = new URL(meta.authorization_endpoint);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", "mcp");
  authUrl.searchParams.set("resource", `${base}/mcp`);

  if (opts.openBrowser !== false) {
    try {
      await open(authUrl.toString());
    } catch {
      /* user can open manually */
    }
  }

  const timeout = opts.timeoutMs ?? 5 * 60 * 1000;
  const code = await Promise.race([
    loop.code,
    new Promise<string>((_, rej) =>
      setTimeout(() => rej(new Error("Login timed out. Try again.")), timeout)
    ),
  ]).finally(() => loop.close());

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
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(
      tokenJson.error_description || tokenJson.error || `Token exchange failed (${tokenRes.status})`
    );
  }

  return {
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token,
    expiresIn: tokenJson.expires_in,
    tokenType: tokenJson.token_type || "Bearer",
    scope: tokenJson.scope,
  };
}

export function dashboardCliAuthorizeUrl(params: {
  codeChallenge: string;
  state: string;
  redirectUri: string;
}): string {
  const u = new URL(`${APP_URL}/cli/authorize`);
  u.searchParams.set("code_challenge", params.codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("state", params.state);
  u.searchParams.set("redirect_uri", params.redirectUri);
  return u.toString();
}
