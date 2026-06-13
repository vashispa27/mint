import type { ApiConfig } from "../api/client";

interface Watcher {
  drain(): Promise<void>;
  stop(): void;
}

export interface LogPublisher {
  log(t: "out" | "err", text: string): void;
}

export interface DaemonState {
  sessionId: string;
  sessionFile: string;
  streamFile: string | null;
  projectRoot: string;
  harness: string;
  transcriptPath: string | null;
  turnStartOffset: number;
  currentTurn: number;
  watcher: Watcher | null;
  api: ApiConfig | null;
  node: string;
  publisher: LogPublisher | null;
}

export function createState(opts: {
  sessionId: string;
  sessionFile: string;
  streamFile: string | null;
  projectRoot: string;
  harness: string;
  api: ApiConfig | null;
  node: string;
  publisher: LogPublisher | null;
}): DaemonState {
  return {
    ...opts,
    transcriptPath: null,
    turnStartOffset: 0,
    currentTurn: 0,
    watcher: null,
  };
}
