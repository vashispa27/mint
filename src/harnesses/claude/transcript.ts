import { join } from "path";

export interface ParsedTurn {
  thinking: string;
  response: string;
  toolCalls: Array<{
    name: string;
    input: Record<string, unknown>;
    output: string;
  }>;
  tokens: {
    input: number;
    output: number;
    cache_read: number;
    cache_write: number;
  };
}

export function expandPath(p: string): string {
  if (p.startsWith("~/")) return join(process.env["HOME"] ?? "~", p.slice(2));
  return p;
}

export async function lineCount(transcriptPath: string): Promise<number> {
  const file = Bun.file(expandPath(transcriptPath));
  if (!(await file.exists())) return 0;
  const text = await file.text();
  return text.split("\n").filter(l => l.trim() !== "").length;
}

export async function readLinesFrom(transcriptPath: string, offset: number): Promise<string[]> {
  const file = Bun.file(expandPath(transcriptPath));
  if (!(await file.exists())) return [];
  const text = await file.text();
  const lines = text.split("\n").filter(l => l.trim() !== "");
  return lines.slice(offset);
}

export function parseTurnLines(lines: string[]): ParsedTurn {
  const thinking: string[] = [];
  const textBlocks: string[] = [];
  const toolUses = new Map<string, { name: string; input: Record<string, unknown> }>();
  const toolResults = new Map<string, string>();
  const tokens = { input: 0, output: 0, cache_read: 0, cache_write: 0 };

  for (const line of lines) {
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }

    if (obj["type"] === "assistant") {
      const msg = obj["message"] as Record<string, unknown>;
      const content = (msg?.["content"] as unknown[]) ?? [];

      for (const block of content) {
        const b = block as Record<string, unknown>;
        if (b["type"] === "thinking" && b["thinking"]) {
          thinking.push(b["thinking"] as string);
        }
        if (b["type"] === "text" && b["text"]) {
          textBlocks.push(b["text"] as string);
        }
        if (b["type"] === "tool_use" && b["id"]) {
          toolUses.set(b["id"] as string, {
            name: b["name"] as string,
            input: (b["input"] as Record<string, unknown>) ?? {},
          });
        }
      }

      const u = msg?.["usage"] as Record<string, number> | undefined;
      if (u) {
        tokens.input += u["input_tokens"] ?? 0;
        tokens.output += u["output_tokens"] ?? 0;
        tokens.cache_read += u["cache_read_input_tokens"] ?? 0;
        tokens.cache_write += u["cache_creation_input_tokens"] ?? 0;
      }
    }

    if (obj["type"] === "user") {
      const msg = obj["message"] as Record<string, unknown>;
      const content = msg?.["content"];
      if (Array.isArray(content)) {
        for (const block of content) {
          const b = block as Record<string, unknown>;
          if (b["type"] === "tool_result") {
            const raw = b["content"];
            const output = Array.isArray(raw)
              ? raw.map((c: unknown) => (c as Record<string, string>)["text"] ?? "").join("")
              : typeof raw === "string"
              ? raw
              : "";
            toolResults.set(b["tool_use_id"] as string, output);
          }
        }
      }
    }
  }

  return {
    thinking: thinking.join("\n"),
    response: textBlocks[textBlocks.length - 1] ?? "",
    toolCalls: [...toolUses.entries()].map(([id, { name, input }]) => ({
      name,
      input,
      output: toolResults.get(id) ?? "",
    })),
    tokens,
  };
}
