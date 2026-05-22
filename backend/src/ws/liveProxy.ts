import { IncomingMessage, Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { GoogleGenAI, Modality, Type, StartSensitivity, EndSensitivity } from "@google/genai";
import { verifyIdToken } from "../middleware/auth";

const SYSTEM_INSTRUCTION = `You are an interior stylist named faber helping the user re-style the room they are showing you on camera.
When they show you furniture, comment on it briefly — material, era, what it pairs well with. Suggest concrete
changes they could make: rearrangements, swaps, accent pieces, color palettes. Keep responses short and
conversational — one or two sentences at a time. Ask follow-up questions to understand their taste.

When the user asks to *see* what something would look like ("show me", "what would it look like",
"can you visualize"), call the visualize_room_change tool with a detailed prompt describing the change.
Don't call it just to describe — only when they want to see it rendered.

You can also design brand-new furniture from scratch when the user asks for it ("design me a…",
"imagine a…", "what if there were a…", "I'm thinking of commissioning a…"). When you do:
  - First describe the piece out loud in one or two sentences — material, silhouette, era influence,
    rough dimensions, and where in the room it would sit.
  - Then call the visualize_room_change tool with a detailed prompt that places the new piece into
    the current room. The prompt should specify the piece's appearance and its placement relative
    to what's already on camera, so the rendering shows it in context rather than on a blank background.
  - If the user pushes back on a detail (wrong wood, too modern, etc.), iterate — describe the
    revision briefly and call the tool again.`;

const LIVE_MODEL = "gemini-3.1-flash-live-preview";
const IMAGE_MODEL = "gemini-3.1-flash-image-preview";

const VISUALIZE_TOOL = {
  functionDeclarations: [
    {
      name: "visualize_room_change",
      description:
        "Generate an edited image showing the user's current room with a proposed styling change applied. Use this only when the user explicitly asks to see something rendered.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          prompt: {
            type: Type.STRING,
            description:
              "A detailed description of the change to apply to the room. Mention furniture, materials, colors, and placement. Example: 'Replace the gray sofa with a tan leather chesterfield; add a brass floor lamp to its left.'",
          },
        },
        required: ["prompt"],
      },
    },
  ],
};

export function attachLiveProxy(server: Server) {
  const wss = new WebSocketServer({ noServer: true });
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  server.on("upgrade", async (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    if (url.pathname !== "/live") {
      socket.destroy();
      return;
    }

    const token = url.searchParams.get("token");
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    try {
      await verifyIdToken(token);
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      handleConnection(ws, ai).catch((err) => {
        console.error("[live] connection error", err);
        try { ws.close(1011, "internal error"); } catch {}
      });
    });
  });
}

async function handleConnection(client: WebSocket, ai: GoogleGenAI) {
  let session: Awaited<ReturnType<typeof ai.live.connect>> | null = null;
  let closed = false;
  let latestFrame: string | null = null; // base64 JPEG, most recent camera frame

  const safeSendToClient = (payload: unknown) => {
    if (closed || client.readyState !== WebSocket.OPEN) return;
    client.send(JSON.stringify(payload));
  };

  const runVisualize = async (prompt: string): Promise<string | null> => {
    if (!latestFrame) return null;
    try {
      const res = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "image/jpeg", data: latestFrame } },
              { text: prompt },
            ],
          },
        ],
      });
      const parts = res.candidates?.[0]?.content?.parts ?? [];
      for (const p of parts) {
        if (p.inlineData?.data) return p.inlineData.data;
      }
      return null;
    } catch (err) {
      console.error("[live] visualize error", err);
      return null;
    }
  };

  session = await ai.live.connect({
    model: LIVE_MODEL,
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [VISUALIZE_TOOL],

    },
    callbacks: {
      onopen: () => safeSendToClient({ type: "ready" }),
      onmessage: async (msg: any) => {
        const sc = msg.serverContent;
        if (sc?.modelTurn?.parts) {
          for (const part of sc.modelTurn.parts) {
            if (part.inlineData?.data) {
              safeSendToClient({
                type: "audio",
                data: part.inlineData.data,
                mimeType: part.inlineData.mimeType,
              });
            }
            if (part.text) {
              safeSendToClient({ type: "text", text: part.text });
            }
          }
        }
        if (sc?.inputTranscription?.text) {
          safeSendToClient({ type: "user-transcript", text: sc.inputTranscription.text });
        }
        if (sc?.outputTranscription?.text) {
          safeSendToClient({ type: "model-transcript", text: sc.outputTranscription.text });
        }
        if (sc?.turnComplete) safeSendToClient({ type: "turn-complete" });
        if (sc?.interrupted) safeSendToClient({ type: "interrupted" });

        // Tool calls
        if (msg.toolCall?.functionCalls?.length) {
          const responses: Array<{ id?: string; name: string; response: any }> = [];
          for (const call of msg.toolCall.functionCalls) {
            if (call.name === "visualize_room_change") {
              const prompt = call.args?.prompt ?? "";
              safeSendToClient({ type: "rendering", prompt });
              const image = await runVisualize(prompt);
              if (image) {
                safeSendToClient({ type: "rendered-image", data: image, prompt });
                responses.push({
                  id: call.id,
                  name: call.name,
                  response: { ok: true, note: "Image rendered and shown to the user." },
                });
              } else {
                safeSendToClient({ type: "render-failed", prompt });
                responses.push({
                  id: call.id,
                  name: call.name,
                  response: { ok: false, error: "Could not generate the image." },
                });
              }
            }
          }
          if (responses.length) {
            try {
              session?.sendToolResponse({ functionResponses: responses });
            } catch (err) {
              console.error("[live] sendToolResponse failed", err);
            }
          }
        }
      },
      onerror: (e: any) => {
        console.error("[live] gemini error", e?.message ?? e);
        safeSendToClient({ type: "error", message: e?.message ?? "gemini error" });
      },
      onclose: () => {
        safeSendToClient({ type: "closed" });
        if (!closed) client.close();
      },
    },
  });

  client.on("message", (raw) => {
    if (!session) return;
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case "audio":
        session.sendRealtimeInput({
          audio: { data: msg.data, mimeType: "audio/pcm;rate=16000" },
        });
        break;
      case "video":
        latestFrame = msg.data;
        session.sendRealtimeInput({
          video: { data: msg.data, mimeType: "image/jpeg" },
        });
        break;
      case "text":
        session.sendClientContent({
          turns: [{ role: "user", parts: [{ text: msg.text }] }],
          turnComplete: true,
        });
        break;
      case "end-audio":
        session.sendRealtimeInput({ audioStreamEnd: true });
        break;
    }
  });

  client.on("close", () => {
    closed = true;
    try { session?.close(); } catch {}
  });

  client.on("error", (err) => {
    console.error("[live] client ws error", err);
    closed = true;
    try { session?.close(); } catch {}
  });
}
