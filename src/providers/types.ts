export type AgentDetection = {
  id: string;
  name: string;
  installed: boolean;
  configPath?: string;
  notes?: string;
};

export type McpServerEntry = {
  url?: string;
  headers?: Record<string, string>;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
};

export type SetupResult = {
  id: string;
  name: string;
  success: boolean;
  configPath?: string;
  message: string;
};

export type RepairResult = {
  id: string;
  fixed: boolean;
  message: string;
};

/** Agent provider plugin interface. */
export interface AgentProvider {
  readonly id: string;
  readonly name: string;
  detect(): Promise<AgentDetection>;
  setup(entry: McpServerEntry): Promise<SetupResult>;
  readStatus(): Promise<{ configured: boolean; configPath?: string; entry?: unknown }>;
  uninstall(): Promise<SetupResult>;
  repair(entry: McpServerEntry): Promise<RepairResult>;
}
