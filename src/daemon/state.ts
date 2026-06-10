export interface DaemonState {
  sessionId: string;
  sessionFile: string;
  projectRoot: string;
  harness: string;
  transcriptPath: string | null;
  turnStartOffset: number;
  currentTurn: number;
}

export function createState(opts: {
  sessionId: string;
  sessionFile: string;
  projectRoot: string;
  harness: string;
}): DaemonState {
  return {
    ...opts,
    transcriptPath: null,
    turnStartOffset: 0,
    currentTurn: 0,
  };
}
