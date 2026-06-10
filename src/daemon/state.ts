interface Watcher {
  drain(): Promise<void>;
  stop(): void;
}

export interface DaemonState {
  sessionId: string;
  sessionFile: string;        // structured hook-based file
  streamFile: string | null;  // raw watcher-based file (only in --stream mode)
  projectRoot: string;
  harness: string;
  transcriptPath: string | null;
  turnStartOffset: number;
  currentTurn: number;
  watcher: Watcher | null;
}

export function createState(opts: {
  sessionId: string;
  sessionFile: string;
  streamFile: string | null;
  projectRoot: string;
  harness: string;
}): DaemonState {
  return {
    ...opts,
    transcriptPath: null,
    turnStartOffset: 0,
    currentTurn: 0,
    watcher: null,
  };
}
