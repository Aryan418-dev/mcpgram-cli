import type { AgentProvider } from "./types.js";
import { cursorProvider } from "./cursor.js";
import { claudeDesktopProvider } from "./claude-desktop.js";
import { claudeCodeProvider } from "./claude-code.js";
import { vscodeProvider } from "./vscode.js";
import { codexProvider } from "./codex.js";
import { geminiProvider } from "./gemini.js";
import {
  openCodeProvider,
  clineProvider,
  windsurfProvider,
  gooseProvider,
  ampProvider,
  aiderProvider,
} from "./generic-json.js";

/** Built-in providers. Add new agents by implementing AgentProvider and appending here. */
export const providers: AgentProvider[] = [
  claudeCodeProvider,
  claudeDesktopProvider,
  cursorProvider,
  vscodeProvider,
  codexProvider,
  geminiProvider,
  openCodeProvider,
  clineProvider,
  windsurfProvider,
  gooseProvider,
  ampProvider,
  aiderProvider,
];

export function getProvider(id: string): AgentProvider | undefined {
  return providers.find((p) => p.id === id || p.name.toLowerCase() === id.toLowerCase());
}

export function listProviderIds(): string[] {
  return providers.map((p) => p.id);
}
