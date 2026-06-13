import type { MqttHandle } from "./client";
import { sessionTopic } from "./client";

export interface SessionStartMsg {
  harness: string;
  repo?: string;
  branch?: string;
  task?: string;
  model?: string;
  node?: string;
  fsPath?: string;
}

export interface Publisher {
  sessionStart(msg: SessionStartMsg): void;
  log(t: "out" | "err", text: string): void;
  update(status: "completed" | "failed" | "timeout", exitCode: number): void;
  disconnect(): Promise<void>;
}

export function createPublisher(
  handle: MqttHandle,
  userId: string,
  sessionId: string,
): Publisher {
  const topic = sessionTopic(userId, sessionId);

  function pub(payload: object): void {
    handle.publish(
      topic,
      JSON.stringify({ ...payload, sessionId, userId, ts: Date.now() }),
    );
  }

  return {
    sessionStart(msg) {
      pub({
        type: "session.start",
        harness: msg.harness,
        repo: msg.repo ?? "",
        branch: msg.branch ?? "",
        task: msg.task ?? "",
        model: msg.model ?? "unknown",
        node: msg.node ?? "local",
        fsPath: msg.fsPath ?? "",
        startedAt: Date.now(),
      });
    },
    log(t, text) {
      pub({ type: "session.log", line: { t, text } });
    },
    update(status, exitCode) {
      pub({ type: "session.update", status, exitCode });
    },
    disconnect: () => handle.disconnect(),
  };
}
