export interface ApiConfig {
  url: string;
  apiKey: string;
}

export function getApiConfig(): ApiConfig | null {
  const url = process.env["SENTINEL_API_URL"];
  const apiKey = process.env["SENTINEL_API_KEY"];
  if (!url || !apiKey) return null;
  return { url, apiKey };
}

export interface SessionStartPayload {
  sessionId: string;
  harness: string;
  model?: string;
  fsPath: string;
  node?: string;
}

export interface SessionEndPayload {
  sessionId: string;
  status: "completed" | "failed" | "crashed";
  exitCode?: number;
}

function authHeaders(config: ApiConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${config.apiKey}`,
  };
}

export async function notifySessionStart(config: ApiConfig, payload: SessionStartPayload): Promise<void> {
  try {
    await fetch(`${config.url}/sessions/start`, {
      method: "POST",
      headers: authHeaders(config),
      body: JSON.stringify(payload),
    });
  } catch {
    // never crash the daemon over a failed API call
  }
}

export async function uploadTranscript(
  config: ApiConfig,
  payload: { sessionId: string; content: string },
): Promise<void> {
  try {
    await fetch(`${config.url}/sessions/transcript/upload`, {
      method: "POST",
      headers: authHeaders(config),
      body: JSON.stringify(payload),
    });
  } catch {
    // never crash over a failed upload
  }
}

export async function notifySessionEnd(config: ApiConfig, payload: SessionEndPayload): Promise<void> {
  try {
    await fetch(`${config.url}/sessions/end`, {
      method: "POST",
      headers: authHeaders(config),
      body: JSON.stringify(payload),
    });
  } catch {
    // never crash the daemon over a failed API call
  }
}
