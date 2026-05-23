import { useState } from "react";
import {
  ArrowRight,
  Box,
  ChevronLeft,
  ChevronRight,
  Info,
  Maximize2,
  Move,
  RotateCw,
  Smartphone,
  X,
} from "lucide-react";

interface ARStepProps {
  onNext: () => void;
  onBack: () => void;
  sessionId: string | null;
  savedMeshUrl: string | null;
}

const HOW_TO_STEPS = [
  {
    icon: <Smartphone className="w-10 h-10 text-[#4A4036]" />,
    title: "Open on your phone",
    body: "On desktop, scan the QR code with your phone's camera to open this session in your mobile browser. On mobile, you're already set.",
  },
  {
    icon: <Move className="w-10 h-10 text-[#4A4036]" />,
    body: "Point your camera at a clear flat floor or table. Move your phone slowly to let AR detect the surface.",
    title: "Find a flat surface",
  },
  {
    icon: <Maximize2 className="w-10 h-10 text-[#4A4036]" />,
    title: "Place & explore",
    body: "Tap the AR button below the model, then tap on your surface to place the piece. Drag to reposition, pinch to scale, two fingers to rotate.",
  },
];

export default function ARStep({ onNext, onBack: _onBack, sessionId, savedMeshUrl }: ARStepProps) {
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(0);

  const sessionUrl = sessionId
    ? `${window.location.origin}/design?session=${sessionId}`
    : null;
  const qrUrl = sessionUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(sessionUrl)}&bgcolor=FDFDFC&color=4A4036&margin=10`
    : null;

  const hasMesh = !!savedMeshUrl;

  return (
    <main className="h-full w-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#DEC8AB] to-[#E2DCD4] flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-[#4A4036]" />
          </div>
          <h1 className="text-3xl sm:text-4xl text-[#4A4036] mb-3 tracking-tight">
            See it in your space
          </h1>
          <p className="text-[#78583C] text-base sm:text-lg max-w-xl mx-auto">
            Place your generated piece in the real room using augmented reality.
          </p>
        </div>

        {hasMesh ? (
          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
            {/* Model viewer with AR */}
            <div className="rounded-2xl border border-[#E2DCD4] bg-[#FDFDFC] overflow-hidden">
              <model-viewer
                src={savedMeshUrl}
                alt="Your generated furniture piece"
                ar
                ar-modes="webxr scene-viewer quick-look"
                ar-scale="auto"
                camera-controls
                auto-rotate
                shadow-intensity="1"
                touch-action="pan-y"
                style={{ width: "100%", height: "420px", background: "transparent" }}
              >
                {/* Custom AR launch button surfaced by model-viewer */}
                <button
                  slot="ar-button"
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#DEC8AB] hover:bg-[#E5D3BC] text-[#4A4036] text-sm tracking-[0.12em] uppercase font-medium shadow-md transition-all"
                  style={{ zIndex: 10 }}
                >
                  <Smartphone className="w-4 h-4" />
                  View in AR
                </button>
              </model-viewer>
              <div className="px-5 py-3 flex items-center justify-between border-t border-[#E2DCD4]">
                <span className="text-xs text-[#B2A592] uppercase tracking-[0.12em]">Step 3 of 4 · AR Viewer</span>
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 text-xs text-[#78583C] hover:text-[#4A4036] transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                  How to use
                </button>
              </div>
            </div>

            {/* QR code + tips */}
            <div className="flex flex-col gap-4">
              {qrUrl && (
                <div className="rounded-2xl border border-[#E2DCD4] bg-[#FDFDFC] p-6 flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-[#4A4036]">
                    <Box className="w-4 h-4 text-[#78583C]" />
                    Open on your phone
                  </div>
                  <img
                    src={qrUrl}
                    alt="QR code to open this session on your phone"
                    className="w-40 h-40 rounded-xl border border-[#E2DCD4]"
                  />
                  <p className="text-xs text-[#B2A592] text-center">
                    Scan with your phone's camera, then tap the AR button in Step 3 to place in your room.
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-[#E2DCD4] bg-[#FDFDFC] p-5 space-y-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[#B2A592]">In AR mode</p>
                {[
                  { icon: <Move className="w-4 h-4" />, label: "Drag to reposition" },
                  { icon: <RotateCw className="w-4 h-4" />, label: "Two fingers to rotate" },
                  { icon: <Maximize2 className="w-4 h-4" />, label: "Pinch to scale" },
                ].map((tip) => (
                  <div key={tip.label} className="flex items-center gap-3 text-sm text-[#4A4036]">
                    <span className="text-[#78583C]">{tip.icon}</span>
                    {tip.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* No mesh yet */
          <div className="rounded-2xl border border-[#E2DCD4] bg-[#FDFDFC] p-12 flex flex-col items-center gap-4 text-center">
            <Box className="w-10 h-10 text-[#B2A592]" />
            <p className="text-[#4A4036]">No 3D model yet.</p>
            <p className="text-sm text-[#B2A592]">
              Go back to Step 2 and wait for Meshy to finish generating your model.
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#DEC8AB] hover:bg-[#E5D3BC] text-[#4A4036] text-sm tracking-[0.12em] uppercase font-medium transition-all cursor-pointer"
          >
            Commission it for real
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* How to use modal */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-[#FDFDFC] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden pointer-events-auto">
              {/* Modal header */}
              <div className="bg-gradient-to-br from-[#DEC8AB] to-[#E2DCD4] px-7 py-5 flex items-center justify-between">
                <div>
                  <h2 className="text-[#4A4036] text-2xl">How to use AR</h2>
                  <p className="text-[#78583C] text-xs mt-0.5">Step {modalStep + 1} of {HOW_TO_STEPS.length}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-9 h-9 rounded-full bg-white/40 hover:bg-white/70 flex items-center justify-center text-[#4A4036] transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step dots */}
              <div className="flex items-center justify-center gap-2 pt-6 pb-2">
                {HOW_TO_STEPS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setModalStep(i)}
                    className={`rounded-full transition-all ${
                      i === modalStep ? "w-8 h-2 bg-[#DEC8AB]" : "w-2 h-2 bg-[#E2DCD4]"
                    }`}
                  />
                ))}
              </div>

              {/* Step content */}
              <div className="px-7 py-5 min-h-[200px] flex flex-col items-center text-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#DEC8AB] to-[#E2DCD4] flex items-center justify-center">
                  {HOW_TO_STEPS[modalStep].icon}
                </div>
                <h3 className="text-[#4A4036] text-xl">{HOW_TO_STEPS[modalStep].title}</h3>
                <p className="text-[#78583C] text-sm leading-relaxed">
                  {HOW_TO_STEPS[modalStep].body}
                </p>
              </div>

              {/* Footer nav */}
              <div className="flex items-center justify-between px-7 py-5 border-t border-[#E2DCD4]">
                <button
                  type="button"
                  onClick={() => setModalStep((s) => Math.max(0, s - 1))}
                  disabled={modalStep === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm text-[#78583C] hover:bg-[#F1EDE9] disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                {modalStep < HOW_TO_STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setModalStep((s) => s + 1)}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#DEC8AB] hover:bg-[#E5D3BC] text-[#4A4036] text-sm transition-all"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setModalStep(0); }}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#DEC8AB] hover:bg-[#E5D3BC] text-[#4A4036] text-sm transition-all"
                  >
                    Got it!
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
