import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Save, Camera as CameraIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { openLiveSession, type LiveSession } from "@/services/liveSession";
import { PcmPlayer } from "@/lib/audio";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Status = "idle" | "connecting" | "listening" | "speaking" | "error";

const FRAME_INTERVAL_MS = 1500;

export function CameraStudio() {
  const { getIdToken } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sessionRef = useRef<LiveSession | null>(null);
  const playerRef = useRef<PcmPlayer | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const frameTimerRef = useRef<number | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [userTranscript, setUserTranscript] = useState("");
  const [modelTranscript, setModelTranscript] = useState("");
  const [lastSuggestion, setLastSuggestion] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [renderedImage, setRenderedImage] = useState<string | null>(null);
  const [renderPrompt, setRenderPrompt] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => () => stopAll(), []);

  async function start() {
    setError(null);
    setStatus("connecting");
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "environment" },
        audio: false,
      });
      camStreamRef.current = camStream;
      if (videoRef.current) {
        videoRef.current.srcObject = camStream;
        await videoRef.current.play();
      }

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      micStreamRef.current = micStream;

      const player = new PcmPlayer(24000);
      await player.resume();
      playerRef.current = player;

      const idToken = await getIdToken();
      if (!idToken) throw new Error("Not signed in");

      const session = await openLiveSession({
        idToken,
        baseUrl: import.meta.env.VITE_API_BASE_URL,
        onEvent: (e) => {
          switch (e.type) {
            case "ready":
              setStatus("listening");
              break;
            case "audio":
              setStatus("speaking");
              playerRef.current?.enqueue(e.data);
              break;
            case "user-transcript":
              setUserTranscript((t) => (t + " " + e.text).trim());
              break;
            case "model-transcript":
              setModelTranscript((t) => (t + " " + e.text).trim());
              setLastSuggestion((s) => (s + " " + e.text).trim());
              break;
            case "turn-complete":
              setStatus("listening");
              break;
            case "interrupted":
              playerRef.current?.interrupt();
              break;
            case "rendering":
              setRendering(true);
              setRenderPrompt(e.prompt);
              break;
            case "rendered-image":
              setRendering(false);
              setRenderedImage(`data:image/png;base64,${e.data}`);
              setRenderPrompt(e.prompt);
              break;
            case "render-failed":
              setRendering(false);
              setError("Couldn't render the visualization — try rephrasing.");
              break;
            case "error":
              setError(e.message);
              setStatus("error");
              break;
            case "closed":
              setStatus("idle");
              break;
          }
        },
      });
      sessionRef.current = session;

      // Mic → worklet → session
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      await ctx.audioWorklet.addModule("/audio-recorder-worklet.js");
      const src = ctx.createMediaStreamSource(micStream);
      const node = new AudioWorkletNode(ctx, "recorder-processor");
      node.port.onmessage = (ev) => {
        const pcm = ev.data as Int16Array;
        session.sendAudioChunk(pcm);
      };
      src.connect(node);
      workletNodeRef.current = node;

      // Video frames every FRAME_INTERVAL_MS
      frameTimerRef.current = window.setInterval(() => sendFrame(), FRAME_INTERVAL_MS);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to start");
      setStatus("error");
      stopAll();
    }
  }

  function sendFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const session = sessionRef.current;
    if (!video || !canvas || !session || video.readyState < 2) return;
    const w = 640;
    const h = Math.round((video.videoHeight / video.videoWidth) * w) || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    const b64 = dataUrl.split(",")[1];
    if (b64) session.sendVideoFrame(b64);
  }

  function stopAll() {
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current = null;
    sessionRef.current?.close();
    sessionRef.current = null;
    playerRef.current?.close();
    playerRef.current = null;
    setStatus("idle");
  }

  async function saveLook() {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    setSaving(true);
    setSaved(false);
    try {
      const w = 800;
      const h = Math.round((video.videoHeight / video.videoWidth) * w) || 600;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas unavailable");
      ctx.drawImage(video, 0, 0, w, h);
      const thumbnail = canvas.toDataURL("image/jpeg", 0.78);
      const title =
        lastSuggestion.split(/[.!?]/)[0]?.trim().slice(0, 60) || "Room snapshot";
      await api.saveLook({
        title,
        thumbnail,
        suggestion: lastSuggestion,
        transcript: `You: ${userTranscript}\n\nStylist: ${modelTranscript}`,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const running = status !== "idle" && status !== "error";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="overflow-hidden">
        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            muted
            playsInline
            className="absolute inset-0 size-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs text-white backdrop-blur">
            <span
              className={cn(
                "size-2 rounded-full",
                status === "listening" && "bg-success-green pulse-orb",
                status === "speaking" && "bg-camel pulse-orb",
                status === "connecting" && "bg-buff-dark animate-pulse",
                status === "idle" && "bg-taupe",
                status === "error" && "bg-destructive",
              )}
            />
            {status === "idle" && "Ready"}
            {status === "connecting" && "Connecting…"}
            {status === "listening" && "Listening"}
            {status === "speaking" && "Stylist talking"}
            {status === "error" && "Error"}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          {!running ? (
            <Button size="lg" onClick={start}>
              <Mic /> Start session
            </Button>
          ) : (
            <Button size="lg" variant="outline" onClick={stopAll}>
              <MicOff /> End session
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={!running || saving} onClick={saveLook}>
              <Save />
              {saving ? "Saving…" : saved ? "Saved!" : "Save look"}
            </Button>
          </div>
        </div>
        {error && (
          <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="flex-1 p-5">
          <h3 className="mb-2 font-serif text-xl text-chestnut">Stylist</h3>
          <p className="min-h-[6rem] whitespace-pre-wrap text-sm leading-relaxed text-brown-text">
            {modelTranscript || (
              <span className="text-muted-foreground">
                Start a session and show me your room — I'll suggest changes as we go.
              </span>
            )}
          </p>
        </Card>
        <Card className="p-5">
          <h3 className="mb-2 flex items-center gap-2 font-serif text-xl text-chestnut">
            <CameraIcon className="size-4" /> You
          </h3>
          <p className="min-h-[3rem] whitespace-pre-wrap text-sm leading-relaxed text-brown-medium">
            {userTranscript || <span className="text-muted-foreground">Your voice transcript appears here.</span>}
          </p>
        </Card>
        {(rendering || renderedImage) && (
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-buff-dark/30 px-5 py-3">
              <Sparkles className="size-4 text-chestnut" />
              <h3 className="font-serif text-lg text-chestnut">Vision</h3>
            </div>
            {rendering && (
              <div className="flex items-center justify-center bg-buff-light/40 px-5 py-10 text-sm text-brown-medium">
                Rendering your room…
              </div>
            )}
            {!rendering && renderedImage && (
              <>
                <img src={renderedImage} alt={renderPrompt ?? "rendered"} className="w-full" />
                {renderPrompt && (
                  <p className="px-5 py-3 text-xs italic text-muted-foreground">"{renderPrompt}"</p>
                )}
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
