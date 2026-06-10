import { appendEvent } from "../../session/writer";
import { lineCount, readLinesFrom, parseTurnLines } from "./transcript";
import type { DaemonState } from "../../daemon/state";

type HookPayload = Record<string, unknown>;

export async function handleHook(body: HookPayload, state: DaemonState): Promise<void> {
  const event = body["hook_event_name"] as string | undefined;

  switch (event) {
    case "SessionStart":
      await onSessionStart(body, state);
      break;
    case "UserPromptSubmit":
      await onUserPromptSubmit(body, state);
      break;
    case "Stop":
      await onStop(body, state);
      break;
    case "SessionEnd":
      await onSessionEnd(body, state);
      break;
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

async function onStop(payload: HookPayload, state: DaemonState): Promise<void> {
  const transcriptPath = (payload["transcript_path"] as string) ?? state.transcriptPath;
  if (!transcriptPath || state.currentTurn === 0) return;

  const newLines = await readLinesFrom(transcriptPath, state.turnStartOffset);
  if (newLines.length === 0) return;

  const parsed = parseTurnLines(newLines);
  const ts = new Date().toISOString();

  for (const tool of parsed.toolCalls) {
    appendEvent(state.sessionFile, {
      event: "tool_call",
      session_id: state.sessionId,
      turn: state.currentTurn,
      name: tool.name,
      input: tool.input,
      output: tool.output,
      ts,
    });
  }

  appendEvent(state.sessionFile, {
    event: "turn_end",
    session_id: state.sessionId,
    turn: state.currentTurn,
    response: parsed.response,
    thinking: parsed.thinking,
    tokens: parsed.tokens,
    ts,
  });

  state.totalInputTokens += parsed.tokens.input;
  state.totalOutputTokens += parsed.tokens.output;
  state.totalCacheTokens += parsed.tokens.cache_read + parsed.tokens.cache_write;
  state.totalToolCalls += parsed.toolCalls.length;

  state.turnStartOffset = await lineCount(transcriptPath);
}

async function onSessionEnd(payload: HookPayload, state: DaemonState): Promise<void> {
  const totalTokens =
    state.totalInputTokens + state.totalOutputTokens + state.totalCacheTokens;

  appendEvent(state.sessionFile, {
    event: "session_end",
    session_id: state.sessionId,
    total_turns: state.currentTurn,
    total_tokens: totalTokens,
    ts: new Date().toISOString(),
  });
}
