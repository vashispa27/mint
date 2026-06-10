export type SessionEvent =
  | SessionStartEvent
  | TurnStartEvent
  | ToolCallEvent
  | TurnEndEvent
  | SessionEndEvent;

export interface SessionStartEvent {
  event: "session_start";
  session_id: string;
  harness: string;
  project: string;
  model: string;
  ts: string;
}

export interface TurnStartEvent {
  event: "turn_start";
  session_id: string;
  turn: number;
  prompt: string;
  ts: string;
}

export interface ToolCallEvent {
  event: "tool_call";
  session_id: string;
  turn: number;
  name: string;
  input: Record<string, unknown>;
  output: string;
  ts: string;
}

export interface TurnEndEvent {
  event: "turn_end";
  session_id: string;
  turn: number;
  response: string;
  thinking: string;
  tokens: {
    input: number;
    output: number;
    cache_read: number;
    cache_write: number;
  };
  ts: string;
}

export interface SessionEndEvent {
  event: "session_end";
  session_id: string;
  total_turns: number;
  total_tokens: number;
  ts: string;
}
