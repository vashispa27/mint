export interface DaemonState {
  sessionId: string;
  sessionFile: string;
  projectRoot: string;
  harness: string;
  transcriptPath: string | null;
  turnStartOffset: number;
  currentTurn: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheTokens: number;
  totalToolCalls: number;
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
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheTokens: 0,
    totalToolCalls: 0,
  };
}
