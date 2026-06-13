import type { MqttHandle } from "./client";
import { sessionTopic } from "./client";

export interface Publisher {
  log(t: "out" | "err", text: string): void;
  update(status: "completed" | "failed", exitCode: number): void;
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
    log(t, text) {
      pub({ type: "session.log", line: { t, text } });
    },
    update(status, exitCode) {
      pub({ type: "session.update", status, exitCode });
    },
    disconnect: () => handle.disconnect(),
  };
}
