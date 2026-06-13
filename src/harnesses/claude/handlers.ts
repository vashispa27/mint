import { appendEvent } from "../../session/writer";
import { lineCount, readLinesFrom } from "./transcript";
import { watchTranscript } from "./watcher";
import type { DaemonState } from "../../daemon/state";

type HookPayload = Record<string, unknown>;

export async function handleHook(body: HookPayload, state: DaemonState): Promise<void> {
  const event = body["hook_event_name"] as string | undefined;

  switch (event) {
    case "SessionStart":     await onSessionStart(body, state);     break;
    case "UserPromptSubmit": await onUserPromptSubmit(body, state); break;
    case "SessionEnd":       await onSessionEnd(body, state);       break;
  }
}

async function onSessionStart(payload: HookPayload, state: DaemonState): Promise<void> {
  const transcriptPath = payload["transcript_path"] as string;
  state.transcriptPath = transcriptPath;

  appendEvent(state.sessionFile, {
    event: "session_start",
    session_id: state.sessionId,
    harness: state.harness,
    project: state.projectRoot,
    model: (payload["model"] as string) ?? "unknown",
    ts: new Date().toISOString(),
  });

  // Start the watcher whenever we have a stream file, a publisher, or both.
  if (state.streamFile || state.publisher) {
    const streamFile = state.streamFile;

    if (streamFile) {
      appendEvent(streamFile, {
        event: "session_start",
        session_id: state.sessionId,
        harness: state.harness,
        project: state.projectRoot,
        model: (payload["model"] as string) ?? "unknown",
        ts: new Date().toISOString(),
      });
    }

    state.watcher = watchTranscript(transcriptPath, (lines) => {
      if (streamFile) {
        appendEvent(streamFile, {
          event: "raw",
          session_id: state.sessionId,
          lines,
          ts: new Date().toISOString(),
        });
      }
      // Publish each transcript line to MQTT as it arrives.
      for (const line of lines) {
        state.publisher?.log("out", typeof line === "string" ? line : JSON.stringify(line));
      }
    });
  }
}

async function onUserPromptSubmit(payload: HookPayload, state: DaemonState): Promise<void> {
  const transcriptPath = (payload["transcript_path"] as string) ?? state.transcriptPath;
  if (!transcriptPath) return;

  // Flush the previous turn's transcript lines now that Claude has finished writing them
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

async function onSessionEnd(_payload: HookPayload, state: DaemonState): Promise<void> {
  const transcriptPath = state.transcriptPath;

  // Flush the last turn to the structured file
  if (transcriptPath && state.currentTurn > 0) {
    await flushRawLines(transcriptPath, state);
  }

  appendEvent(state.sessionFile, {
    event: "session_end",
    session_id: state.sessionId,
    ts: new Date().toISOString(),
  });

  if (state.streamFile || state.publisher) {
    await state.watcher?.drain();
    state.watcher?.stop();

    if (state.streamFile) {
      appendEvent(state.streamFile, {
        event: "session_end",
        session_id: state.sessionId,
        ts: new Date().toISOString(),
      });
    }
  }
}

async function flushRawLines(transcriptPath: string, state: DaemonState): Promise<void> {
  const rawStrings = await readLinesFrom(transcriptPath, state.turnStartOffset);
  if (rawStrings.length === 0) return;

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
