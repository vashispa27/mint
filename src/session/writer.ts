import { appendFileSync } from "fs";
import type { SessionEvent } from "./types";

export function appendEvent(sessionFile: string, event: SessionEvent): void {
  appendFileSync(sessionFile, JSON.stringify(event) + "\n");
}
