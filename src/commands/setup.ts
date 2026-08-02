/**
 * Thin re-export / alias so `mcpgram setup` maps cleanly.
 * Implementation lives in agents.ts (detect + provider plugins).
 */
export {
  setupCmd,
  scanCmd,
  agentsCmd,
  repairCmd,
  uninstallAgentsCmd,
} from "./agents.js";
