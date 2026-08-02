import crypto from "node:crypto";

/** Generate a high-entropy PKCE code verifier (43–128 chars). */
export function generateCodeVerifier(): string {
  return base64Url(crypto.randomBytes(32));
}

/** S256 code challenge from verifier. */
export function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return base64Url(hash);
}

export function generateState(): string {
  return base64Url(crypto.randomBytes(16));
}

function base64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
