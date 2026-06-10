import { watch, type FSWatcher } from "fs";
import { dirname, basename } from "path";
import { expandPath } from "./transcript";

type OnLines = (lines: unknown[]) => void;

export interface TranscriptWatcher {
  drain(): Promise<void>;
  stop(): void;
}

export function watchTranscript(transcriptPath: string, onLines: OnLines): TranscriptWatcher {
  const absPath = expandPath(transcriptPath);
  const dir = dirname(absPath);
  const targetFile = basename(absPath);

  let charOffset = 0;
  let lineBuffer = "";
  let watcher: FSWatcher | null = null;
  let stopped = false;
  let reading = false;
  let pendingRead = false;

  const doRead = async (): Promise<void> => {
    if (stopped) return;
    reading = true;
    pendingRead = false;

    try {
      const file = Bun.file(absPath);
      if (!(await file.exists())) return;

      const text = await file.text();
      if (text.length <= charOffset) return;

      lineBuffer += text.slice(charOffset);
      charOffset = text.length;

      const parts = lineBuffer.split("\n");
      lineBuffer = parts.pop() ?? ""; // keep incomplete trailing line buffered

      const parsed: unknown[] = [];
      for (const line of parts) {
        if (!line.trim()) continue;
        try { parsed.push(JSON.parse(line)); }
        catch { /* skip malformed lines */ }
      }

      if (parsed.length > 0) onLines(parsed);
    } finally {
      reading = false;
      if (pendingRead) doRead();
    }
  };

  const scheduleRead = () => {
    if (reading) { pendingRead = true; return; }
    doRead();
  };

  try {
    watcher = watch(dir, (_event, filename) => {
      if (filename === targetFile) scheduleRead();
    });
  } catch {
    // directory doesn't exist yet — session will be incomplete
    // polling fallback to be added later
  }

  return {
    async drain() {
      await doRead();
    },
    stop() {
      stopped = true;
      watcher?.close();
    },
  };
}
