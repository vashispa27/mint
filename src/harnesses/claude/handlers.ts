import { appendEvent } from "../../session/writer";
import { lineCount, readLinesFrom } from "./transcript";
import type { DaemonState } from "../../daemon/state";

type HookPayload = Record<string, unknown>;

export async function handleHook(body: HookPayload, state: DaemonState): Promise<void> {
  const event = body["hook_event_name"] as string | undefined;

  switch (event) {
    case "SessionStart":      await onSessionStart(body, state);      break;
    case "UserPromptSubmit":  await onUserPromptSubmit(body, state);  break;
    case "Stop":              break; // no-op — transcript isn't fully flushed yet
    case "SessionEnd":        await onSessionEnd(body, state);        break;
  }
}

async function onSessionStart(payload: HookPayload, state: DaemonState): Promise<void> {
  state.transcriptPath = payload["transcript_path"] as string;

  appendEvent(state.sessionFile, {
    event: "session_start",
    session_id: state.sessionId,
    harness: state.harness,
    project: state.projectRoot,
    model: (payload["model"] as string) ?? "unknown",
    ts: new Date().toISOString(),
  });
}

async function onUserPromptSubmit(payload: HookPayload, state: DaemonState): Promise<void> {
  const transcriptPath = (payload["transcript_path"] as string) ?? state.transcriptPath;
  if (!transcriptPath) return;

  // Flush the previous turn's raw lines now that Claude has finished writing them
  if (state.currentTurn > 0) {
    await flushRawLines(transcriptPath, state);
  }

  state.transcriptPath = transcriptPath;
  state.currentTurn++;
  state.turnStartOffset = await lineCount(transcriptPath);

  appendEvent(state.sessionFile, {
    event: "turn_start",
    session_id: state.sessionId,
    turn: state.currentTurn,
    prompt: (payload["prompt"] as string) ?? "",
    ts: new Date().toISOString(),
  });
}

async function onSessionEnd(payload: HookPayload, state: DaemonState): Promise<void> {
  const transcriptPath = (payload["transcript_path"] as string) ?? state.transcriptPath;

  // Flush the last turn's raw lines
  if (transcriptPath && state.currentTurn > 0) {
    await flushRawLines(transcriptPath, state);
  }

  appendEvent(state.sessionFile, {
    event: "session_end",
    session_id: state.sessionId,
    total_turns: state.currentTurn,
    ts: new Date().toISOString(),
  });
}

async function flushRawLines(transcriptPath: string, state: DaemonState): Promise<void> {
  const rawStrings = await readLinesFrom(transcriptPath, state.turnStartOffset);
  if (rawStrings.length === 0) return;

  // Parse each line into an object so we don't double-encode when we JSON.stringify the event
  const lines = rawStrings.map(l => {
    try { return JSON.parse(l) as unknown; }
    catch { return l; }
  });

  appendEvent(state.sessionFile, {
    event: "raw",
    session_id: state.sessionId,
    turn: state.currentTurn,
    lines,
    ts: new Date().toISOString(),
  });

  state.turnStartOffset = await lineCount(transcriptPath);
}
