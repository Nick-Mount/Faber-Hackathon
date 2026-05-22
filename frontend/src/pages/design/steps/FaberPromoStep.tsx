import { CheckCircle, ExternalLink, Hammer, MessageCircle, Sparkles } from "lucide-react";

interface FaberPromoStepProps {
  onStartAnother: () => void;
}

const FABER_URL = "https://www.fabermark.com";

const PERKS = [
  {
    icon: Hammer,
    title: "Vetted American makers",
    body: "Every commission is built by an independent shop we've verified — no factory drop-shipping.",
  },
  {
    icon: MessageCircle,
    title: "Talk to the maker directly",
    body: "Share your AR mock-up and chat through wood, finish, and dimensions before anything is built.",
  },
  {
    icon: Sparkles,
    title: "One of one",
    body: "Your piece is made for your room. Not a SKU.",
  },
];

export default function FaberPromoStep({ onStartAnother }: FaberPromoStepProps) {
  return (
    <main className="h-full w-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#7F9869]/15 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-[#7F9869]" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl text-[#4A4036] mb-4 tracking-tight">
            Love the piece? Have it made.
          </h1>
          <p className="text-[#78583C] text-lg max-w-2xl mx-auto">
            What you just designed can be built by a real maker through Faber — the marketplace for
            custom furniture, commissioned end-to-end.
          </p>
        </div>

        <div className="rounded-3xl overflow-hidden border border-[#E2DCD4] bg-[#FDFDFC] mb-10">
          <div className="grid md:grid-cols-2">
            <div className="p-8 sm:p-10 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo_black.svg" alt="Faber" className="w-8 h-8" />
                <span className="text-[#4A4036] text-xl tracking-[0.18em]">FABER</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#4A4036] mb-4">
                Custom furniture, commissioned.
              </h2>
              <p className="text-[#78583C] leading-relaxed mb-6">
                Bring your AI-designed piece to Faber. We match it with the maker best suited to
                build it, manage the project, and deliver it to your door.
              </p>
              <a
                href={FABER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#4A4036] hover:bg-[#5C4F41] text-[#FDFDFC] text-sm tracking-[0.18em] uppercase font-medium transition-all w-fit cursor-pointer"
              >
                Visit Faber
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <div className="bg-gradient-to-br from-[#DEC8AB] via-[#E5D3BC] to-[#F6EADB] p-10 flex items-center justify-center min-h-[320px]">
              <img
                src="/logo_black.svg"
                alt="Faber"
                className="w-40 h-40 opacity-90"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3 mb-10">
          {PERKS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-[#E2DCD4] bg-[#FDFDFC] p-6"
            >
              <div className="w-10 h-10 rounded-full bg-[#F6EADB] flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-[#78583C]" />
              </div>
              <h3 className="font-serif text-xl text-[#4A4036] mb-2">{title}</h3>
              <p className="text-sm text-[#78583C] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={FABER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-[#DEC8AB] hover:bg-[#E5D3BC] text-[#4A4036] text-sm tracking-[0.18em] uppercase font-medium transition-all cursor-pointer"
          >
            Commission this piece on Faber
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={onStartAnother}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl border border-[#E2DCD4] hover:bg-[#F1EDE9] text-[#78583C] text-sm tracking-[0.18em] uppercase font-medium transition-all cursor-pointer"
          >
            Design another piece
          </button>
        </div>
      </div>
    </main>
  );
}
