export type SessionEvent =
  | SessionStartEvent
  | TurnStartEvent
  | RawEvent
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

// Raw transcript objects for a completed turn — parsed at read time by mint show/log
export interface RawEvent {
  event: "raw";
  session_id: string;
  turn: number;
  lines: unknown[];
  ts: string;
}

export interface SessionEndEvent {
  event: "session_end";
  session_id: string;
  total_turns: number;
  ts: string;
}
