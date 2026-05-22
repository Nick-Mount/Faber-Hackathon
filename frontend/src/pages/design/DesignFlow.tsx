import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const STEPS = [
  { num: 1, label: "Describe", icon: MessageSquare },
  { num: 2, label: "Model", icon: Box },
  { num: 3, label: "Place", icon: Smartphone },
  { num: 4, label: "Commission", icon: PartyPopper },
] as const;

export default function DesignFlow() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const handleClose = useCallback(() => {
    if (furthestStep < 2) {
      navigate("/");
      return;
    }
    setShowCloseModal(true);
  }, [furthestStep, navigate]);

  const handleSaveDraft = useCallback(() => {
    setShowCloseModal(false);
    navigate("/gallery");
  }, [navigate]);

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
        return next;
      });
      setIsTransitioning(false);
    }, 300);
  }, []);

  const prevStep = useCallback(() => {
    setIsTransitioning(true);
    window.setTimeout(() => {
      setCurrentStep((prev) => Math.max(prev - 1, 1));
      setIsTransitioning(false);
    }, 300);
  }, []);

  const handleStartAnother = useCallback(() => {
    setFurthestStep(1);
    setCurrentStep(1);
  }, []);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StylistStep onNext={nextStep} />;
      case 2:
        return <MeshyStep onNext={nextStep} onBack={prevStep} />;
      case 3:
        return <ARStep onNext={nextStep} onBack={prevStep} />;
      case 4:
        return <FaberPromoStep onStartAnother={handleStartAnother} />;
      default:
        return <StylistStep onNext={nextStep} />;
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
        {renderStep()}
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
