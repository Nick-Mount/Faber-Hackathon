/**
 * Browser-side wrapper around the backend's /live WebSocket proxy to Gemini Live.
 *
 * Wire protocol (JSON, both directions):
 *   client → server: { type: "audio", data: base64 }    // PCM16 mono @ 16kHz chunks
 *                    { type: "video", data: base64 }    // JPEG frame
 *                    { type: "text",  text: string }
 *                    { type: "end-audio" }
 *   server → client: { type: "ready" }
 *                    { type: "audio", data: base64, mimeType: "audio/pcm;rate=24000" }
 *                    { type: "text",  text: string }
 *                    { type: "user-transcript" | "model-transcript", text: string }
 *                    { type: "turn-complete" | "interrupted" | "closed" | "error", ... }
 */

export type LiveEvent =
  | { type: "ready" }
  | { type: "audio"; data: string; mimeType: string }
  | { type: "text"; text: string }
  | { type: "user-transcript"; text: string }
  | { type: "model-transcript"; text: string }
  | { type: "turn-complete" }
  | { type: "interrupted" }
  | { type: "rendering"; prompt: string }
  | { type: "rendered-image"; data: string; prompt: string }
  | { type: "render-failed"; prompt: string }
  | { type: "closed" }
  | { type: "error"; message: string };

export interface LiveSession {
  sendAudioChunk: (pcm: Int16Array) => void;
  sendVideoFrame: (jpegBase64: string) => void;
  sendText: (text: string) => void;
  close: () => void;
}

export function openLiveSession(opts: {
  idToken: string;
  baseUrl?: string;
  onEvent: (e: LiveEvent) => void;
}): Promise<LiveSession> {
  return new Promise((resolve, reject) => {
    const base = opts.baseUrl ?? "";
    const wsProto = base.startsWith("https") ? "wss" : base.startsWith("http") ? "ws"
      : location.protocol === "https:" ? "wss" : "ws";
    const host = base ? base.replace(/^https?:\/\//, "") : location.host;
    const url = `${wsProto}://${host}/live?token=${encodeURIComponent(opts.idToken)}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      resolve({
        sendAudioChunk: (pcm) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(JSON.stringify({ type: "audio", data: int16ToBase64(pcm) }));
        },
        sendVideoFrame: (b64) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(JSON.stringify({ type: "video", data: b64 }));
        },
        sendText: (text) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(JSON.stringify({ type: "text", text }));
        },
        close: () => ws.close(),
      });
    };
    ws.onerror = (e) => reject(e);
    ws.onmessage = (e) => {
      try { opts.onEvent(JSON.parse(e.data)); } catch {}
    };
    ws.onclose = () => opts.onEvent({ type: "closed" });
  });
}

function int16ToBase64(buf: Int16Array): string {
  const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}
