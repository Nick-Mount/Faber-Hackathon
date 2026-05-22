import { ArrowRight, Smartphone, ScanLine } from "lucide-react";

interface ARStepProps {
  onNext: () => void;
  onBack: () => void;
}

export default function ARStep({ onNext, onBack: _onBack }: ARStepProps) {
  return (
    <main className="h-full w-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-16">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#DEC8AB] to-[#E2DCD4] flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-[#4A4036]" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl text-[#4A4036] mb-4 tracking-tight">
            See it in your space
          </h1>
          <p className="text-[#78583C] text-lg">
            Place the piece in the real room with ARCore. Walk around it. Decide if it works.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
          <div className="rounded-2xl border border-[#E2DCD4] bg-[#FDFDFC] p-6 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-[#F6EADB] flex items-center justify-center">
              <ScanLine className="w-6 h-6 text-[#78583C]" />
            </div>
            <h2 className="font-serif text-2xl text-[#4A4036]">Scan to open AR</h2>
            <p className="text-sm text-[#78583C] leading-relaxed">
              On an ARCore-capable phone, open the link to drop the model into your room. Move
              your phone slowly to lock the floor.
            </p>
            <div className="mt-2 grid place-items-center rounded-xl bg-[#F1EDE9] aspect-square p-8">
              <div className="w-full h-full rounded-lg bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22><rect width=%2210%22 height=%2210%22 fill=%22%23E2DCD4%22/><rect x=%221%22 y=%221%22 width=%224%22 height=%224%22 fill=%22%234A4036%22/></svg>')] bg-repeat opacity-70" />
            </div>
            <p className="text-xs text-center text-[#B2A592]">
              QR placeholder — wire up ARCore deep link here.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E2DCD4] bg-[#FDFDFC] overflow-hidden flex flex-col">
            <div className="flex-1 bg-gradient-to-br from-[#F6EADB] via-[#F1EDE9] to-[#E2DCD4] grid place-items-center min-h-[280px]">
              <div className="text-center px-6">
                <p className="text-sm text-[#78583C] tracking-[0.12em] uppercase">
                  AR preview coming soon
                </p>
                <p className="text-xs text-[#B2A592] mt-2">
                  Drop the model-viewer or ARCore embed in this card.
                </p>
              </div>
            </div>
            <div className="px-5 py-4 flex items-center justify-between border-t border-[#E2DCD4]">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[#B2A592]">Step 3 of 4</p>
                <p className="text-sm text-[#4A4036] mt-0.5">View in AR</p>
              </div>
              <span className="rounded-full bg-[#F6EADB] text-[#78583C] text-xs px-3 py-1.5 tracking-wide">
                Placeholder
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-end">
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
    </main>
  );
}
