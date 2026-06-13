export interface MqttConfig {
  endpoint: string;
  token: string;
  userId: string;
}

export function getMqttConfig(): MqttConfig | null {
  const endpoint = process.env["SENTINEL_IOT_ENDPOINT"];
  const token = process.env["SENTINEL_TOKEN"];
  const userId = process.env["SENTINEL_USER_ID"];
  if (!endpoint || !token || !userId) return null;
  return { endpoint, token, userId };
}

export interface MqttHandle {
  publish(topic: string, payload: string): void;
  disconnect(): Promise<void>;
}

export async function connectMqtt(config: MqttConfig): Promise<MqttHandle> {
  const url =
    `wss://${config.endpoint}/mqtt` +
    `?token=${encodeURIComponent(config.token)}` +
    `&x-amz-customauthorizer-name=sentinel-jwt-authorizer`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, ["mqtt"]);
    (ws as unknown as { binaryType: string }).binaryType = "arraybuffer";

    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("MQTT connect timeout"));
    }, 10_000);

    ws.onopen = () => {
      ws.send(buildConnect(`mint-${Date.now()}`));
    };

    ws.onmessage = (event: MessageEvent) => {
      const buf = new Uint8Array(event.data as ArrayBuffer);
      // CONNACK: 0x20  remlen=0x02  sessionPresent  returnCode
      if (buf[0] === 0x20) {
        clearTimeout(timer);
        if (buf[3] === 0x00) {
          resolve(makeHandle(ws));
        } else {
          ws.close();
          reject(new Error(`MQTT connection refused (code ${buf[3]})`));
        }
      }
    };

    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error("WebSocket error"));
    };
  });
}

function makeHandle(ws: WebSocket): MqttHandle {
  return {
    publish(topic, payload) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(buildPublish(topic, payload));
      }
    },
    disconnect() {
      return new Promise<void>((resolve) => {
        if (ws.readyState !== WebSocket.OPEN) { resolve(); return; }
        ws.send(buildDisconnect());
        ws.onclose = () => resolve();
        ws.close();
      });
    },
  };
}

export function sessionTopic(userId: string, sessionId: string): string {
  return `users/${userId}/sessions/${sessionId}`;
}

// ── MQTT packet builders ────────────────────────────────────────────────────

function remLen(n: number): Uint8Array {
  const bytes: number[] = [];
  do {
    let b = n & 0x7f;
    n >>= 7;
    if (n > 0) b |= 0x80;
    bytes.push(b);
  } while (n > 0);
  return new Uint8Array(bytes);
}

function utf8Field(s: string): Uint8Array {
  const data = new TextEncoder().encode(s);
  const out = new Uint8Array(2 + data.length);
  out[0] = data.length >> 8;
  out[1] = data.length & 0xff;
  out.set(data, 2);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

function buildConnect(clientId: string): Uint8Array {
  const varHeader = new Uint8Array([
    0x00, 0x04, 0x4d, 0x51, 0x54, 0x54, // "MQTT"
    0x04,       // protocol level 4 = MQTT 3.1.1
    0x02,       // connect flags: clean session
    0x00, 0x3c, // keep-alive: 60 s
  ]);
  const body = concat(varHeader, utf8Field(clientId));
  return concat(new Uint8Array([0x10]), remLen(body.length), body);
}

function buildPublish(topic: string, message: string): Uint8Array {
  const body = concat(utf8Field(topic), new TextEncoder().encode(message));
  return concat(new Uint8Array([0x30]), remLen(body.length), body); // QoS 0
}

function buildDisconnect(): Uint8Array {
  return new Uint8Array([0xe0, 0x00]);
}
