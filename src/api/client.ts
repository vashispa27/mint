export interface ApiConfig {
  url: string;
  userId: string;
}

export function getApiConfig(): ApiConfig | null {
  const url = process.env["MINT_API_URL"];
  const userId = process.env["MINT_USER_ID"];
  if (!url || !userId) return null;
  return { url, userId };
}

export interface SessionStartPayload {
  userId: string;
  sessionId: string;
  harness: string;
  model?: string;
  fsPath: string;
  node?: string;
}

export interface SessionEndPayload {
  userId: string;
  sessionId: string;
  status: "completed" | "failed" | "crashed";
  exitCode?: number;
}

export async function notifySessionStart(config: ApiConfig, payload: SessionStartPayload): Promise<void> {
  try {
    await fetch(`${config.url}/sessions/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // never crash the daemon over a failed API call
  }
}

export async function notifySessionEnd(config: ApiConfig, payload: SessionEndPayload): Promise<void> {
  try {
    await fetch(`${config.url}/sessions/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // never crash the daemon over a failed API call
  }
}
