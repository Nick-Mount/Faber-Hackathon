import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Box, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { api, type MeshyTask } from "@/services/api";

interface MeshyStepProps {
  onNext: () => void;
  onBack: () => void;
  imageDataUrl: string | null;
  prompt: string | null;
  sessionId: string | null;
  savedMeshUrl: string | null;
}

const POLL_INTERVAL_MS = 5000;

export default function MeshyStep({
  onNext,
  onBack,
  imageDataUrl,
  prompt,
  sessionId,
  savedMeshUrl,
}: MeshyStepProps) {
  const [task, setTask] = useState<MeshyTask | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [meshSaved, setMeshSaved] = useState(false);
  const meshSaveAttemptedRef = useRef<string | null>(null);
  const startedForRef = useRef<string | null>(null);

  async function startTask(image: string) {
    if (startedForRef.current === image) return;
    startedForRef.current = image;
    setStarting(true);
    setError(null);
    setTask(null);
    try {
      const { taskId: id } = await api.startImageTo3d(image);
      setTaskId(id);
    } catch (err: any) {
      setError(err?.message ?? "Failed to start 3D generation");
      startedForRef.current = null;
    } finally {
      setStarting(false);
    }
  }

  // Kick off when an image is available. Skip when we're resuming with a
  // saved mesh — that path already has a model to render.
  useEffect(() => {
    if (savedMeshUrl) return;
    if (imageDataUrl) startTask(imageDataUrl);
  }, [imageDataUrl, savedMeshUrl]);

  // Poll the task until terminal.
  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const t = await api.getMeshyTask(taskId);
        if (cancelled) return;
        setTask(t);
        if (t.status === "SUCCEEDED" || t.status === "FAILED" || t.status === "CANCELED" || t.status === "EXPIRED") {
          return;
        }
        window.setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message ?? "Failed to poll Meshy");
      }
    };
    poll();

    return () => {
      cancelled = true;
    };
  }, [taskId]);

  // Persist the mesh to the session once the task succeeds. One attempt per
  // taskId — the backend downloads the GLB and stores bytes inline.
  useEffect(() => {
    if (!sessionId || !taskId) return;
    if (task?.status !== "SUCCEEDED") return;
    if (meshSaveAttemptedRef.current === taskId) return;
    meshSaveAttemptedRef.current = taskId;
    api
      .saveSessionMesh(sessionId, taskId)
      .then(() => setMeshSaved(true))
      .catch((err) => {
        console.warn("mesh save failed", err);
        meshSaveAttemptedRef.current = null;
      });
  }, [sessionId, taskId, task?.status]);

  const retry = () => {
    if (!imageDataUrl) return;
    startedForRef.current = null;
    setTaskId(null);
    setTask(null);
    setError(null);
    startTask(imageDataUrl);
  };

  const liveModelUrl = task?.modelUrls?.glb ?? null;
  const modelUrl = savedMeshUrl ?? liveModelUrl;
  const succeeded = !!savedMeshUrl || (task?.status === "SUCCEEDED" && !!liveModelUrl);
  const failed = !savedMeshUrl && (task?.status === "FAILED" || task?.status === "CANCELED" || task?.status === "EXPIRED");
  const progress = task?.progress ?? 0;
  const meshIsSaved = !!savedMeshUrl || meshSaved;

  return (
    <main className="h-full w-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-16">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#DEC8AB] to-[#E2DCD4] flex items-center justify-center">
            <Box className="w-8 h-8 text-[#4A4036]" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl text-[#4A4036] mb-4 tracking-tight">
            Turning your vision into 3D
          </h1>
          <p className="text-[#78583C] text-lg">
            Meshy is sculpting the piece you described. This usually takes a minute.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E2DCD4] bg-[#FDFDFC] overflow-hidden">
          <div className="aspect-video bg-gradient-to-br from-[#F6EADB] via-[#F1EDE9] to-[#E2DCD4] flex items-center justify-center relative">
            {!imageDataUrl && (
              <div className="text-center px-6">
                <AlertCircle className="w-10 h-10 text-[#B2A592] mx-auto mb-3" />
                <p className="text-sm text-[#4A4036]">No image yet — go back and generate a visualization first.</p>
                <button
                  type="button"
                  onClick={onBack}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#DEC8AB] text-[#4A4036] text-sm hover:bg-[#F6EADB]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to stylist
                </button>
              </div>
            )}

            {imageDataUrl && !succeeded && !failed && (
              <div className="text-center">
                {imageDataUrl && (
                  <img
                    src={imageDataUrl}
                    alt={prompt ?? "source"}
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                  />
                )}
                <div className="relative">
                  <Loader2 className="w-10 h-10 text-[#78583C] mx-auto mb-4 animate-spin" />
                  <p className="text-sm text-[#78583C] tracking-[0.12em] uppercase">
                    {starting
                      ? "Sending image to Meshy…"
                      : task?.status === "PENDING"
                      ? "Queued"
                      : "Generating"}
                  </p>
                  <p className="text-xs text-[#B2A592] mt-2">{Math.round(progress)}%</p>
                  <div className="mt-3 w-48 h-1.5 mx-auto rounded-full bg-[#E2DCD4] overflow-hidden">
                    <div
                      className="h-full bg-[#78583C] transition-all duration-500"
                      style={{ width: `${Math.max(4, Math.round(progress))}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {succeeded && modelUrl && (
              <model-viewer
                src={modelUrl}
                alt={prompt ?? "Generated 3D model"}
                camera-controls
                auto-rotate
                shadow-intensity="1"
                exposure="1"
                poster={task?.thumbnailUrl ?? undefined}
                style={{ width: "100%", height: "100%", background: "transparent" }}
              />
            )}

            {failed && (
              <div className="text-center px-6">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <p className="text-sm text-[#4A4036] mb-1">3D generation failed</p>
                <p className="text-xs text-[#B2A592] mb-4">
                  {task?.taskError?.message ?? "Meshy returned an error."}
                </p>
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#DEC8AB] hover:bg-[#E5D3BC] text-[#4A4036] text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </button>
              </div>
            )}
          </div>
          <div className="px-5 py-4 flex items-center justify-between border-t border-[#E2DCD4] gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.12em] text-[#B2A592]">Step 2 of 4</p>
              <p className="text-sm text-[#4A4036] mt-0.5 truncate">
                {prompt ? `"${prompt}"` : "Meshy 3D generation"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {succeeded && meshIsSaved && (
                <span className="rounded-full bg-[#F6EADB] text-[#78583C] text-xs px-2.5 py-1 tracking-wide whitespace-nowrap">
                  Saved
                </span>
              )}
              <span
                className={`rounded-full text-xs px-3 py-1.5 tracking-wide whitespace-nowrap ${
                  succeeded
                    ? "bg-[#E4ECDB] text-[#4F6541]"
                    : failed
                    ? "bg-red-50 text-red-600"
                    : "bg-[#F6EADB] text-[#78583C]"
                }`}
              >
                {succeeded
                  ? "Ready"
                  : failed
                  ? "Failed"
                  : starting
                  ? "Starting…"
                  : task?.status
                  ? task.status.replace("_", " ").toLowerCase()
                  : "Waiting"}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[#78583C] hover:text-[#4A4036] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!succeeded}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#DEC8AB] hover:bg-[#E5D3BC] text-[#4A4036] text-sm tracking-[0.12em] uppercase font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            View in AR
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  );
}
