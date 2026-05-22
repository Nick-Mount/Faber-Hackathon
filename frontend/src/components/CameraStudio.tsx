import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Save, Camera as CameraIcon, Sparkles, ChevronLeft, ChevronRight, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { openLiveSession, type LiveSession } from "@/services/liveSession";
import { PcmPlayer } from "@/lib/audio";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Status = "idle" | "connecting" | "listening" | "speaking" | "error";

const FRAME_INTERVAL_MS = 1500;
// PCM16 RMS threshold (~ -40 dBFS). Below this, treat as background noise and skip.
const NOISE_GATE_RMS = 325;

interface CameraStudioProps {
  onNext?: () => void;
  nextLabel?: string;
}

export function CameraStudio({ onNext, nextLabel = "Generate 3D model" }: CameraStudioProps = {}) {
  const { getIdToken } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const desktopVideoRef = useRef<HTMLVideoElement>(null);
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const mutedRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    // Try to prefetch the camera preview on mount. iOS Safari requires a user
    // gesture for getUserMedia, so this attempt is best-effort — failure is
    // silent and the first mic-button tap will request camera + mic together.
    (async () => {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          camStream.getTracks().forEach((t) => t.stop());
          return;
        }
        camStreamRef.current = camStream;
        attachCamStream(camStream);
      } catch {
        // Silently ignored — we'll prompt on first user gesture.
      }
    })();
    return () => {
      cancelled = true;
      stopAll();
    };
  }, []);

  function attachCamStream(stream: MediaStream) {
    if (videoRef.current && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
    if (desktopVideoRef.current && desktopVideoRef.current.srcObject !== stream) {
      desktopVideoRef.current.srcObject = stream;
      desktopVideoRef.current.play().catch(() => {});
    }
  }

  async function start() {
    setError(null);
    setStatus("connecting");
    try {
      if (!camStreamRef.current) {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "environment" },
          audio: false,
        });
        camStreamRef.current = camStream;
      }
      attachCamStream(camStreamRef.current);

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
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

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      await ctx.audioWorklet.addModule("/audio-recorder-worklet.js");
      const src = ctx.createMediaStreamSource(micStream);
      const node = new AudioWorkletNode(ctx, "recorder-processor");
      node.port.onmessage = (ev) => {
        if (mutedRef.current) return;
        const pcm = ev.data as Int16Array;
        // RMS noise gate: drop chunks below ~ -40 dBFS so faint background sounds
        // don't get forwarded to Gemini.
        let sumSq = 0;
        for (let i = 0; i < pcm.length; i++) sumSq += pcm[i] * pcm[i];
        const rms = Math.sqrt(sumSq / pcm.length);
        if (rms < NOISE_GATE_RMS) return;
        session.sendAudioChunk(pcm);
      };
      src.connect(node);
      workletNodeRef.current = node;

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

  const startingRef = useRef(false);
  const pressedRef = useRef(false);

  function unmute() {
    if (mutedRef.current) {
      mutedRef.current = false;
      setMuted(false);
    }
  }

  function muteAndFlush() {
    if (!mutedRef.current) {
      mutedRef.current = true;
      setMuted(true);
      sessionRef.current?.sendEndAudio();
    }
  }

  async function handlePressStart() {
    if (pressedRef.current) return;
    pressedRef.current = true;
    if (running) {
      unmute();
      return;
    }
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      await start();
      // Only go hot if still being held; release during connect leaves muted.
      if (pressedRef.current) unmute();
    } finally {
      startingRef.current = false;
    }
  }

  function handlePressEnd() {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    muteAndFlush();
  }

  const statusPill = (
    <div className="flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs text-white backdrop-blur">
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
      {status === "listening" && (muted ? "Hold mic to talk" : "Listening")}
      {status === "speaking" && "Stylist talking"}
      {status === "error" && "Error"}
    </div>
  );

  return (
    <>
      {/* MOBILE: fullscreen camera below the workbench header */}
      <div className="fixed inset-x-0 bottom-0 top-[68px] z-30 bg-black lg:hidden">
        <video
          ref={videoRef}
          muted
          playsInline
          className="absolute inset-0 size-full object-cover"
        />

        {/* Side tab — opens transcript/menu panel. Hidden while menu is open;
            the panel renders its own mirrored tab to close. */}
        {!mobileMenuOpen && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="absolute right-0 top-1/2 z-10 flex h-16 w-7 -translate-y-1/2 items-center justify-center rounded-l-xl bg-black/55 text-white shadow-lg backdrop-blur active:scale-95"
            aria-label="Open menu"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}

        <div className="pointer-events-none absolute inset-0 flex flex-col">
          <div className="flex items-start p-4">
            <div className="pointer-events-auto">{statusPill}</div>
          </div>

          <div className="mt-auto flex items-end justify-between gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {/* Thumbnail / rendering indicator — bottom left */}
            <div className="pointer-events-auto">
              {rendering ? (
                <div className="flex size-20 items-center justify-center rounded-xl border border-white/40 bg-black/55 text-[10px] text-white backdrop-blur">
                  <div className="flex flex-col items-center gap-1">
                    <Sparkles className="size-4 animate-pulse" />
                    <span>Rendering…</span>
                  </div>
                </div>
              ) : renderedImage ? (
                <button
                  type="button"
                  onClick={() => setImageOpen(true)}
                  className="block size-20 overflow-hidden rounded-xl border-2 border-white/80 shadow-lg active:scale-95"
                  aria-label="Enlarge generated image"
                >
                  <img src={renderedImage} alt={renderPrompt ?? "rendered"} className="size-full object-cover" />
                </button>
              ) : null}
            </div>

            {/* Primary mic button — bottom right. Hold to talk. */}
            <div className="pointer-events-auto flex flex-col items-center gap-1">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  void handlePressStart();
                }}
                onPointerUp={handlePressEnd}
                onPointerCancel={handlePressEnd}
                onContextMenu={(e) => e.preventDefault()}
                className={cn(
                  "flex size-16 items-center justify-center rounded-full text-white shadow-lg transition-all touch-none select-none",
                  !running || muted ? "bg-chestnut/80" : "bg-success-green scale-110",
                )}
                aria-label={!running ? "Hold to start session" : muted ? "Hold to talk" : "Recording, release to send"}
              >
                {!running || muted ? <MicOff className="size-7" /> : <Mic className="size-7" />}
              </button>
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/80 drop-shadow">
                {!running ? "Hold to start" : muted ? "Hold to talk" : "Release to send"}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="absolute inset-x-0 bottom-24 mx-4 rounded-md border border-destructive/40 bg-destructive/90 px-4 py-2 text-sm text-white">
            {error}
          </div>
        )}

        {/* Slide-in menu panel */}
        {mobileMenuOpen && (
          <div className="absolute inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
            <div
              className="absolute inset-0"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden
            />
            {/* Mirrored pull tab — closes the menu. Sibling of the panel so
                the panel's overflow-y-auto doesn't clip it. */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-1/2 z-[60] flex h-16 w-7 -translate-y-1/2 items-center justify-center rounded-l-xl bg-black/55 text-white shadow-lg backdrop-blur active:scale-95"
              style={{ right: "min(20rem, 85%)" }}
              aria-label="Close menu"
            >
              <ChevronRight className="size-5" />
            </button>
            <div className="relative ml-auto h-full w-[min(20rem,85%)] overflow-y-auto bg-off-white-1 p-5 shadow-2xl">
              <h2 className="mb-4 font-serif text-2xl text-chestnut">Studio</h2>

              <div className="flex flex-col gap-3">
                {onNext && (
                  <Button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNext();
                    }}
                  >
                    {nextLabel}
                    <ArrowRight />
                  </Button>
                )}

                <Button
                  variant="secondary"
                  disabled={!running || saving}
                  onClick={() => {
                    saveLook();
                    setMobileMenuOpen(false);
                  }}
                >
                  <Save />
                  {saving ? "Saving…" : saved ? "Saved!" : "Save look"}
                </Button>

                {running && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      stopAll();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <MicOff /> End session
                  </Button>
                )}

                <Card className="p-4">
                  <h3 className="mb-2 font-serif text-lg text-chestnut">Stylist</h3>
                  <p className="min-h-[5rem] whitespace-pre-wrap text-sm leading-relaxed text-brown-text">
                    {modelTranscript || (
                      <span className="text-muted-foreground">
                        Start a session and show me your room.
                      </span>
                    )}
                  </p>
                </Card>

                <Card className="p-4">
                  <h3 className="mb-2 flex items-center gap-2 font-serif text-lg text-chestnut">
                    <CameraIcon className="size-4" /> You
                  </h3>
                  <p className="min-h-[3rem] whitespace-pre-wrap text-sm leading-relaxed text-brown-medium">
                    {userTranscript || (
                      <span className="text-muted-foreground">Your transcript appears here.</span>
                    )}
                  </p>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Enlarged image modal */}
        {imageOpen && renderedImage && (
          <div
            className="absolute inset-0 z-50 flex flex-col bg-black/95"
            onClick={() => setImageOpen(false)}
          >
            <div className="flex justify-end p-4">
              <button
                type="button"
                onClick={() => setImageOpen(false)}
                className="rounded-full bg-white/10 p-2.5 text-white backdrop-blur"
                aria-label="Close image"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center px-4">
              <img
                src={renderedImage}
                alt={renderPrompt ?? "rendered"}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            </div>
            {renderPrompt && (
              <p className="px-6 py-4 text-center text-sm italic text-white/80">
                "{renderPrompt}"
              </p>
            )}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* DESKTOP: original side-by-side layout */}
      <div className="hidden gap-6 lg:grid lg:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden">
          <div className="relative aspect-video bg-black">
            <video
              ref={desktopVideoRef}
              muted
              playsInline
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute left-4 top-4">{statusPill}</div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                void handlePressStart();
              }}
              onPointerUp={handlePressEnd}
              onPointerCancel={handlePressEnd}
              onPointerLeave={handlePressEnd}
              onContextMenu={(e) => e.preventDefault()}
              className={cn(
                "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-6 text-base font-medium text-white shadow transition-all touch-none select-none",
                !running || muted
                  ? "bg-chestnut hover:bg-chestnut/90"
                  : "bg-success-green scale-105",
              )}
              aria-label={!running ? "Hold to start session" : muted ? "Hold to talk" : "Recording, release to send"}
            >
              {!running || muted ? <MicOff /> : <Mic />}
              {!running
                ? "Hold to start"
                : muted
                ? "Hold to talk"
                : "Release to send"}
            </button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" disabled={!running || saving} onClick={saveLook}>
                <Save />
                {saving ? "Saving…" : saved ? "Saved!" : "Save look"}
              </Button>
              {running && (
                <Button variant="ghost" onClick={stopAll}>
                  End session
                </Button>
              )}
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
              {userTranscript || (
                <span className="text-muted-foreground">Your voice transcript appears here.</span>
              )}
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
    </>
  );
}
