import { APP_URL } from "../lib/constants.js";
import { isJson, printJson } from "../lib/output.js";
import { info, warn } from "../utils/ui.js";
import open from "open";

/** No public marketplace REST on /api/v1 yet. Apps live in the dashboard. */
export async function marketplaceSearchCmd(query: string): Promise<void> {
  const url = `${APP_URL}/apps?q=${encodeURIComponent(query)}`;
  if (isJson()) {
    printJson({
      ok: true,
      query,
      message: "Marketplace search is available in the dashboard Apps page.",
      url,
    });
    return;
  }
  warn("CLI marketplace search uses the dashboard Apps catalog.");
  info(url);
  try {
    await open(url);
  } catch {
    /* ignore */
  }
}

export async function marketplaceGetCmd(id: string): Promise<void> {
  const url = `${APP_URL}/apps/${encodeURIComponent(id)}`;
  if (isJson()) {
    printJson({ ok: true, id, url });
    return;
  }
  info(url);
}

export async function marketplaceInstallCmd(id: string): Promise<void> {
  const url = `${APP_URL}/apps/${encodeURIComponent(id)}`;
  if (isJson()) {
    printJson({
      ok: true,
      id,
      message: "Complete OAuth/connect in the browser.",
      url,
    });
    return;
  }
  warn("Open the app page to connect (OAuth).");
  info(url);
  try {
    await open(url);
  } catch {
    /* ignore */
  }
}

export async function marketplacePublishCmd(): Promise<void> {
  const payload = {
    ok: false,
    error:
      "Publishing connectors to a public marketplace is not available via CLI yet. Contact MCPGRAM for partner listing.",
  };
  if (isJson()) {
    printJson(payload);
    return;
  }
  warn(payload.error);
}
