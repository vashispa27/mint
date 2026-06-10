import type { DaemonState } from "../daemon/state";

export interface HarnessDefinition {
  name: string;
  command: string;
  installHooks(projectRoot: string, socketPath: string): Promise<void>;
  handleHook(body: Record<string, unknown>, state: DaemonState): Promise<void>;
}
