import { ArrowRight, Box, Loader2 } from "lucide-react";

interface MeshyStepProps {
  onNext: () => void;
  onBack: () => void;
}

export default function MeshyStep({ onNext, onBack: _onBack }: MeshyStepProps) {
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
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-[#78583C] mx-auto mb-4 animate-spin" />
              <p className="text-sm text-[#78583C] tracking-[0.12em] uppercase">
                Meshy hookup coming soon
              </p>
              <p className="text-xs text-[#B2A592] mt-2">
                Drop the Meshy preview/iframe in this card.
              </p>
            </div>
          </div>
          <div className="px-5 py-4 flex items-center justify-between border-t border-[#E2DCD4]">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-[#B2A592]">Step 2 of 4</p>
              <p className="text-sm text-[#4A4036] mt-0.5">Meshy 3D generation</p>
            </div>
            <span className="rounded-full bg-[#F6EADB] text-[#78583C] text-xs px-3 py-1.5 tracking-wide">
              Placeholder
            </span>
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#DEC8AB] hover:bg-[#E5D3BC] text-[#4A4036] text-sm tracking-[0.12em] uppercase font-medium transition-all cursor-pointer"
          >
            View in AR
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  );
}
