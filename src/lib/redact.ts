/**
 * Mask secrets in CLI output (tokens, keys, passwords, Authorization headers).
 */

const SECRET_KEY =
  /^(authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|token|bearer|client[_-]?secret|private[_-]?key)$/i;

const SECRET_VALUE =
  /\b(sk-[a-zA-Z0-9_-]{16,}|ghp_[a-zA-Z0-9]{20,}|xox[baprs]-[a-zA-Z0-9-]{10,}|Bearer\s+[A-Za-z0-9._~+/=-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g;

export function maskSecret(value: string, visible = 4): string {
  if (!value || value.length <= visible * 2) return "****";
  return `${value.slice(0, visible)}…${value.slice(-visible)}`;
}

export function redactString(s: string): string {
  return s.replace(SECRET_VALUE, (m) => maskSecret(m, 4));
}

export function redactDeep(value: unknown, depth = 0): unknown {
  if (depth > 12) return "[MaxDepth]";
  if (value == null) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY.test(k) && typeof v === "string") {
        out[k] = maskSecret(v);
      } else {
        out[k] = redactDeep(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}
