import { ArrowRight } from "lucide-react";
import { CameraStudio } from "@/components/CameraStudio";
import type { AlbumEntry } from "@/services/api";

interface StylistStepProps {
  onNext: () => void;
  onRendered?: (roomImage: string, meshImage: string, prompt: string | null) => void;
  initialAlbum?: AlbumEntry[];
  initialUserTranscript?: string;
  initialModelTranscript?: string;
  onAlbumChange?: (album: AlbumEntry[]) => void;
  onTranscriptChange?: (userTranscript: string, modelTranscript: string) => void;
  autoStart?: boolean;
}

export default function StylistStep({
  onNext,
  onRendered,
  initialAlbum,
  initialUserTranscript,
  initialModelTranscript,
  onAlbumChange,
  onTranscriptChange,
  autoStart,
}: StylistStepProps) {
  return (
    <main className="h-full w-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl text-[#4A4036] mb-3 tracking-tight">
            Show your room. Talk it out.
          </h1>
          <p className="text-[#78583C] text-base sm:text-lg max-w-2xl mx-auto">
            Point your camera at the space you want to change. The stylist sees what you see and
            suggests pieces as you go.
          </p>
        </div>

        <CameraStudio
          onNext={onNext}
          nextLabel="Generate 3D model"
          onRendered={onRendered}
          initialAlbum={initialAlbum}
          initialUserTranscript={initialUserTranscript}
          initialModelTranscript={initialModelTranscript}
          onAlbumChange={onAlbumChange}
          onTranscriptChange={onTranscriptChange}
          autoStart={autoStart}
        />

        <div className="mt-10 flex justify-end">
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#DEC8AB] hover:bg-[#E5D3BC] text-[#4A4036] text-sm tracking-[0.12em] uppercase font-medium transition-all cursor-pointer"
          >
            Generate 3D model
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  );
}
