import { APP_URL } from "../lib/constants.js";
import { isJson, printJson } from "../lib/output.js";
import { info, warn } from "../utils/ui.js";
import open from "open";

/** API key CRUD is dashboard-only today (no public /api/v1/keys for Bearer). */
export async function keysListCmd(): Promise<void> {
  const url = `${APP_URL}/dashboard/settings`;
  const payload = {
    ok: true,
    managed_in: "dashboard",
    url,
    message: "List/create/revoke API keys in the MCPGRAM dashboard (Settings).",
  };
  if (isJson()) {
    printJson(payload);
    return;
  }
  warn(payload.message);
  info(url);
}

export async function keysCreateCmd(opts: { open?: boolean } = {}): Promise<void> {
  const url = `${APP_URL}/dashboard/settings`;
  if (opts.open !== false) {
    try {
      await open(url);
    } catch {
      /* ignore */
    }
  }
  if (isJson()) {
    printJson({
      ok: true,
      message: "Create the key in the dashboard. It is shown only once — store it securely.",
      url,
    });
    return;
  }
  warn("API keys are created in the dashboard and shown only once.");
  info(url);
}

export async function keysRevokeCmd(id: string): Promise<void> {
  const url = `${APP_URL}/dashboard/settings`;
  if (isJson()) {
    printJson({
      ok: true,
      id,
      message: "Revoke keys in the dashboard Settings page.",
      url,
    });
    return;
  }
  warn(`Revoke key ${id} in the dashboard.`);
  info(url);
}
