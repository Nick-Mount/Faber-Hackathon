import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, signInWithGoogle, loading } = useAuth();

  const firstName = user?.displayName?.split(" ")[0];

  const handlePrimary = () => {
    if (user) {
      navigate("/design");
    } else {
      void signInWithGoogle();
    }
  };

  return (
    <section className="fixed inset-0 z-0 flex items-center justify-center overflow-hidden pt-16 md:pt-0 bg-[#D9D3CA]">
      <div className="absolute inset-0">
        <img
          src="/hero_bench.png"
          alt="Sculptural wooden bench"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#D9D3CA]/90 via-transparent to-[#D9D3CA]/40" />
      </div>

      <div className="relative z-10 text-center max-w-5xl px-4 sm:px-8 flex flex-col items-center">
        <div className="text-[#4A4036]/60 text-[10px] sm:text-xs tracking-[0.3em] sm:tracking-[0.4em] mb-6 sm:mb-8 uppercase">
          The future is handmade
        </div>
        <h1 className="text-[#2B2419] text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[1.1] mb-8 sm:mb-12 tracking-tight font-light px-4">
          {user && firstName ? `Welcome back, ${firstName}` : "What do you want to make?"}
        </h1>

        {loading ? null : user ? (
          <>
            <button
              type="button"
              onClick={() => navigate("/design")}
              className="bg-[#2B2419] hover:bg-[#4A4036] text-white px-8 sm:px-12 md:px-16 py-4 sm:py-5 md:py-6 text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase transition-all min-h-[44px] cursor-pointer"
            >
              Start Designing
            </button>

            <span className="my-4 text-[#4A4036]/40 text-xs tracking-[0.2em]">— or —</span>

            <button
              type="button"
              onClick={() => navigate("/gallery")}
              className="border border-[#4A4036]/40 hover:border-[#4A4036] text-[#4A4036]/70 hover:text-[#4A4036] px-8 sm:px-12 md:px-16 py-3 sm:py-4 md:py-5 text-xs tracking-[0.15em] sm:tracking-[0.2em] uppercase transition-all min-h-[44px] cursor-pointer"
            >
              View Gallery
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handlePrimary}
              className="bg-[#2B2419] hover:bg-[#4A4036] text-white px-8 sm:px-12 md:px-16 py-4 sm:py-5 md:py-6 text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase transition-all min-h-[44px] cursor-pointer"
            >
              Sign In to Begin
            </button>

            <span className="my-4 text-[#4A4036]/40 text-xs tracking-[0.2em]">— or —</span>

            <a
              href="https://www.fabermark.com"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-[#4A4036]/40 hover:border-[#4A4036] text-[#4A4036]/70 hover:text-[#4A4036] px-8 sm:px-12 md:px-16 py-3 sm:py-4 md:py-5 text-xs tracking-[0.15em] sm:tracking-[0.2em] uppercase transition-all min-h-[44px]"
            >
              Visit Faber.com
            </a>
          </>
        )}
      </div>
    </section>
  );
}
