/**
 * Lightweight JSON Schema validation for tool inputs (no external deps).
 */

export type ValidationIssue = { path: string; message: string };

type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: unknown[];
  items?: JsonSchema;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  additionalProperties?: boolean | JsonSchema;
  description?: string;
};

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function matchesType(v: unknown, t: string): boolean {
  if (t === "integer") return typeof v === "number" && Number.isInteger(v);
  if (t === "number") return typeof v === "number" && !Number.isNaN(v);
  if (t === "object") return v !== null && typeof v === "object" && !Array.isArray(v);
  return typeOf(v) === t;
}

export function validateAgainstSchema(
  data: unknown,
  schema: unknown,
  path = ""
): ValidationIssue[] {
  if (!schema || typeof schema !== "object") return [];
  const s = schema as JsonSchema;
  const issues: ValidationIssue[] = [];
  const here = path || "$";

  if (s.type) {
    const types = Array.isArray(s.type) ? s.type : [s.type];
    if (!types.some((t) => matchesType(data, t))) {
      issues.push({
        path: here,
        message: `expected type ${types.join("|")}, got ${typeOf(data)}`,
      });
      return issues;
    }
  }

  if (s.enum && !s.enum.some((e) => Object.is(e, data))) {
    issues.push({ path: here, message: `must be one of ${JSON.stringify(s.enum)}` });
  }

  if (typeof data === "string") {
    if (s.minLength != null && data.length < s.minLength) {
      issues.push({ path: here, message: `minLength ${s.minLength}` });
    }
    if (s.maxLength != null && data.length > s.maxLength) {
      issues.push({ path: here, message: `maxLength ${s.maxLength}` });
    }
  }

  if (typeof data === "number") {
    if (s.minimum != null && data < s.minimum) {
      issues.push({ path: here, message: `minimum ${s.minimum}` });
    }
    if (s.maximum != null && data > s.maximum) {
      issues.push({ path: here, message: `maximum ${s.maximum}` });
    }
  }

  if (Array.isArray(data) && s.items) {
    data.forEach((item, i) => {
      issues.push(...validateAgainstSchema(item, s.items, `${here}[${i}]`));
    });
  }

  if (data && typeof data === "object" && !Array.isArray(data) && s.properties) {
    const obj = data as Record<string, unknown>;
    for (const key of s.required ?? []) {
      if (!(key in obj) || obj[key] === undefined) {
        issues.push({ path: `${here}.${key}`, message: "required" });
      }
    }
    for (const [key, propSchema] of Object.entries(s.properties)) {
      if (key in obj && obj[key] !== undefined) {
        issues.push(...validateAgainstSchema(obj[key], propSchema, `${here}.${key}`));
      }
    }
  }

  return issues;
}

export function formatValidationError(issues: ValidationIssue[]): string {
  return issues.map((i) => `${i.path}: ${i.message}`).join("; ");
}
