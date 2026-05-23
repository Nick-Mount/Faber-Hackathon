import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Box,
  CheckCircle,
  MessageSquare,
  PartyPopper,
  Save,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import StylistStep from "./steps/StylistStep";
import MeshyStep from "./steps/MeshyStep";
import ARStep from "./steps/ARStep";
import FaberPromoStep from "./steps/FaberPromoStep";
import { api, type AlbumEntry, type PatchSessionBody } from "@/services/api";

const STEPS = [
  { num: 1, label: "Describe", icon: MessageSquare },
  { num: 2, label: "Model", icon: Box },
  { num: 3, label: "Place", icon: Smartphone },
  { num: 4, label: "Commission", icon: PartyPopper },
] as const;

const PERSIST_DEBOUNCE_MS = 1500;

export default function DesignFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get("session");

  const [currentStep, setCurrentStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [latestImage, setLatestImage] = useState<string | null>(null);
  const [latestMeshImage, setLatestMeshImage] = useState<string | null>(null);
  const [latestPrompt, setLatestPrompt] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [savedMeshUrl, setSavedMeshUrl] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState<boolean>(!!resumeId);
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const [album, setAlbum] = useState<AlbumEntry[]>([]);
  const [userTranscript, setUserTranscript] = useState<string>("");
  const [modelTranscript, setModelTranscript] = useState<string>("");
  // True once we've finished loading an existing session — gates auto-start of
  // the live mic on Step 1 when resuming so the user isn't surprised by audio.
  const [resumedFromSaved, setResumedFromSaved] = useState<boolean>(false);
  // Guards re-entrancy: handleRendered can fire again before the first
  // createSession resolves; the ref makes that second call wait+update.
  const sessionCreationRef = useRef<Promise<string> | null>(null);

  // Debounced PATCH queue — transcripts update every Gemini chunk, so we
  // coalesce writes instead of hammering the API.
  const pendingPatchRef = useRef<PatchSessionBody>({});
  const patchTimerRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const flushPatch = useCallback(async () => {
    if (patchTimerRef.current) {
      window.clearTimeout(patchTimerRef.current);
      patchTimerRef.current = null;
    }
    if (Object.keys(pendingPatchRef.current).length === 0) return;

    let id = sessionIdRef.current;
    if (!id && sessionCreationRef.current) {
      try {
        id = await sessionCreationRef.current;
      } catch {
        return;
      }
    }
    // No session yet (e.g., user talked before generating a render). Keep the
    // pending updates queued so the next flush — usually triggered when a
    // render creates the session — picks them up.
    if (!id) return;

    const pending = pendingPatchRef.current;
    pendingPatchRef.current = {};
    try {
      await api.patchSession(id, pending);
    } catch (err) {
      console.warn("session patch failed", err);
    }
  }, []);

  const queuePatch = useCallback(
    (body: PatchSessionBody, opts: { immediate?: boolean } = {}) => {
      pendingPatchRef.current = { ...pendingPatchRef.current, ...body };
      if (patchTimerRef.current) {
        window.clearTimeout(patchTimerRef.current);
        patchTimerRef.current = null;
      }
      if (opts.immediate) {
        void flushPatch();
        return;
      }
      patchTimerRef.current = window.setTimeout(() => {
        void flushPatch();
      }, PERSIST_DEBOUNCE_MS);
    },
    [flushPatch],
  );

  // Flush on unmount so we don't lose the last few seconds of transcript.
  useEffect(() => {
    return () => {
      void flushPatch();
    };
  }, [flushPatch]);

  // Resume an existing session: hydrate step / image / mesh from the API.
  useEffect(() => {
    if (!resumeId) return;
    let cancelled = false;
    let createdMeshUrl: string | null = null;
    setHydrating(true);
    setHydrationError(null);
    (async () => {
      try {
        const { session } = await api.getSession(resumeId);
        if (cancelled) return;
        setSessionId(session.id);
        setLatestImage(session.thumbnail);
        setLatestMeshImage(session.meshImage ?? null);
        setLatestPrompt(session.prompt);
        setModelTranscript(session.suggestion ?? "");
        setUserTranscript(session.transcript ?? "");
        setAlbum(Array.isArray(session.renderedImages) ? session.renderedImages : []);
        setResumedFromSaved(true);
        const step = Math.max(1, Math.min(STEPS.length, session.currentStep || 1));
        setCurrentStep(step);
        setFurthestStep(step);
        if (session.hasMesh) {
          createdMeshUrl = await api.getMeshBlobUrl(session.id);
          if (cancelled) {
            URL.revokeObjectURL(createdMeshUrl);
            return;
          }
          setSavedMeshUrl(createdMeshUrl);
        }
      } catch (err: any) {
        if (!cancelled) setHydrationError(err?.message ?? "Failed to load session");
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
      if (createdMeshUrl) URL.revokeObjectURL(createdMeshUrl);
    };
  }, [resumeId]);

  const handleRendered = useCallback(
    (roomImage: string, meshImage: string, prompt: string | null) => {
      setLatestImage(roomImage);
      setLatestMeshImage(meshImage);
      setLatestPrompt(prompt);

      const payload: PatchSessionBody = {
        thumbnail: roomImage,
        meshImage,
        prompt: prompt ?? "",
      };

      if (sessionId) {
        queuePatch(payload, { immediate: true });
        return;
      }
      if (sessionCreationRef.current) {
        sessionCreationRef.current
          .then((id) => api.patchSession(id, payload))
          .catch((err) => console.warn("session patch failed", err));
        return;
      }
      const title = prompt?.slice(0, 60) || "Untitled session";
      sessionCreationRef.current = api
        .createSession({
          title,
          thumbnail: roomImage,
          meshImage,
          prompt,
        })
        .then((res) => {
          setSessionId(res.session.id);
          return res.session.id;
        })
        .catch((err) => {
          console.warn("session create failed", err);
          sessionCreationRef.current = null;
          throw err;
        });
    },
    [sessionId, queuePatch],
  );

  const handleAlbumChange = useCallback(
    (next: AlbumEntry[]) => {
      setAlbum(next);
      queuePatch({ renderedImages: next });
    },
    [queuePatch],
  );

  const handleTranscriptChange = useCallback(
    (nextUser: string, nextModel: string) => {
      setUserTranscript(nextUser);
      setModelTranscript(nextModel);
      queuePatch({ transcript: nextUser, suggestion: nextModel });
    },
    [queuePatch],
  );

  const patchStep = useCallback(
    (step: number, completed?: boolean) => {
      if (!sessionId) return;
      queuePatch({ currentStep: step, completed }, { immediate: true });
    },
    [sessionId, queuePatch],
  );

  const handleClose = useCallback(() => {
    if (furthestStep < 2) {
      navigate("/");
      return;
    }
    setShowCloseModal(true);
  }, [furthestStep, navigate]);

  const handleSaveDraft = useCallback(() => {
    void flushPatch();
    setShowCloseModal(false);
    navigate("/gallery");
  }, [navigate, flushPatch]);

  const handleDiscard = useCallback(() => {
    setShowCloseModal(false);
    navigate("/");
  }, [navigate]);

  const nextStep = useCallback(() => {
    setIsTransitioning(true);
    window.setTimeout(() => {
      setCurrentStep((prev) => {
        const next = Math.min(prev + 1, STEPS.length);
        setFurthestStep((f) => Math.max(f, next));
        patchStep(next, next === STEPS.length);
        return next;
      });
      setIsTransitioning(false);
    }, 300);
  }, [patchStep]);

  const prevStep = useCallback(() => {
    setIsTransitioning(true);
    window.setTimeout(() => {
      setCurrentStep((prev) => {
        const next = Math.max(prev - 1, 1);
        patchStep(next);
        return next;
      });
      setIsTransitioning(false);
    }, 300);
  }, [patchStep]);

  const handleStartAnother = useCallback(() => {
    setFurthestStep(1);
    setCurrentStep(1);
    setLatestImage(null);
    setLatestMeshImage(null);
    setLatestPrompt(null);
    setSessionId(null);
    setAlbum([]);
    setUserTranscript("");
    setModelTranscript("");
    setResumedFromSaved(false);
    pendingPatchRef.current = {};
    sessionCreationRef.current = null;
    setSavedMeshUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    if (resumeId) navigate("/design", { replace: true });
  }, [navigate, resumeId]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StylistStep
            onNext={nextStep}
            onRendered={handleRendered}
            initialAlbum={album}
            initialUserTranscript={userTranscript}
            initialModelTranscript={modelTranscript}
            onAlbumChange={handleAlbumChange}
            onTranscriptChange={handleTranscriptChange}
            autoStart={!resumedFromSaved}
          />
        );
      case 2:
        return (
          <MeshyStep
            onNext={nextStep}
            onBack={prevStep}
            imageDataUrl={latestMeshImage ?? latestImage}
            prompt={latestPrompt}
            sessionId={sessionId}
            savedMeshUrl={savedMeshUrl}
          />
        );
      case 3:
        return (
          <ARStep
            onNext={nextStep}
            onBack={prevStep}
            sessionId={sessionId}
            savedMeshUrl={savedMeshUrl}
          />
        );
      case 4:
        return <FaberPromoStep onStartAnother={handleStartAnother} />;
      default:
        return (
          <StylistStep
            onNext={nextStep}
            onRendered={handleRendered}
            initialAlbum={album}
            initialUserTranscript={userTranscript}
            initialModelTranscript={modelTranscript}
            onAlbumChange={handleAlbumChange}
            onTranscriptChange={handleTranscriptChange}
            autoStart={!resumedFromSaved}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#F1EDE9] flex flex-col">
      <header className="flex-shrink-0 bg-[#FDFDFC] border-b border-[#E2DCD4] px-4 sm:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {currentStep > 1 && currentStep < 4 ? (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-2 text-[#78583C] hover:text-[#4A4036] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline text-sm">Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <img src="/logo_black.svg" alt="Faber" className="w-7 h-7" />
                <span className="hidden sm:inline text-[#4A4036] text-lg tracking-wide">
                  FABER
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {STEPS.map((s, i) => {
              const isCompleted = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              const Icon = s.icon;
              return (
                <div key={s.num} className="flex items-center gap-1 sm:gap-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCompleted
                          ? "bg-[#7F9869] border-[#7F9869] text-white"
                          : isCurrent
                          ? "bg-[#DEC8AB] border-[#DEC8AB] text-[#4A4036]"
                          : "bg-transparent border-[#E2DCD4] text-[#B2A592]"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                    </div>
                    <span
                      className={`hidden md:inline text-xs uppercase tracking-wider ${
                        isCurrent
                          ? "text-[#4A4036]"
                          : isCompleted
                          ? "text-[#7F9869]"
                          : "text-[#B2A592]"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`w-6 sm:w-10 h-0.5 rounded-full transition-colors ${
                        currentStep > s.num ? "bg-[#7F9869]" : "bg-[#E2DCD4]"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F1EDE9] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-[#4A4036]" />
          </button>
        </div>
      </header>

      <div
        className={`flex-1 transition-opacity duration-300 ${
          currentStep === 4 ? "overflow-y-auto" : "overflow-hidden"
        } ${isTransitioning ? "opacity-0" : "opacity-100"}`}
      >
        {hydrating ? (
          <div className="flex h-full items-center justify-center text-[#78583C] text-sm tracking-[0.12em] uppercase">
            Restoring session…
          </div>
        ) : hydrationError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-red-600">{hydrationError}</p>
            <button
              type="button"
              onClick={() => navigate("/gallery")}
              className="px-4 py-2 rounded-xl border border-[#DEC8AB] text-[#4A4036] text-sm"
            >
              Back to gallery
            </button>
          </div>
        ) : (
          renderStep()
        )}
      </div>

      {showCloseModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
            onClick={() => setShowCloseModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 pointer-events-auto">
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#F6EADB] flex items-center justify-center">
                  <Save className="w-6 h-6 text-[#78583C]" />
                </div>
                <h2 className="text-2xl text-[#4A4036] mb-2">Leave this design?</h2>
                <p className="text-sm text-[#78583C] leading-relaxed">
                  You've started shaping a piece. Save it to your gallery to pick up later, or
                  discard it.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="w-full py-4 rounded-2xl bg-[#DEC8AB] hover:bg-[#E5D3BC] text-[#4A4036] text-sm tracking-[0.12em] uppercase font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Save to gallery
                </button>
                <button
                  type="button"
                  onClick={handleDiscard}
                  className="w-full py-4 rounded-2xl border-2 border-red-200 hover:bg-red-50 text-red-500 text-sm tracking-[0.12em] uppercase font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Discard design
                </button>
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="w-full py-3 text-sm text-[#B2A592] hover:text-[#78583C] transition-colors cursor-pointer"
                >
                  Keep working
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
