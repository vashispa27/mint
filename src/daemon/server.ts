import { unlinkSync } from "fs";
import type { DaemonState } from "./state";

type HookHandler = (body: Record<string, unknown>, state: DaemonState) => Promise<void>;

export function startDaemon(socketPath: string, state: DaemonState, handleHook: HookHandler): { stop: () => void } {
  try { unlinkSync(socketPath); } catch {}

  const server = Bun.serve({
    unix: socketPath,
    async fetch(req) {
      if (req.method === "POST" && new URL(req.url).pathname === "/hook") {
        const body = await req.json() as Record<string, unknown>;
        await handleHook(body, state);
        return new Response("ok");
      }
      return new Response("not found", { status: 404 });
    },
  });

  return {
    stop() {
      server.stop(true);
      try { unlinkSync(socketPath); } catch {}
    },
  };
}
