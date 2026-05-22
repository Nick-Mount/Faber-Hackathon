import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles } from "lucide-react";

export default function LandingPage() {
  const { user, signInWithGoogle, loading } = useAuth();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-buff-dark/50 bg-off-white-1 px-3 py-1 text-xs text-brown-medium">
            <Sparkles className="size-3.5 text-chestnut" />
            Live AI styling, by camera
          </div>
          <h1 className="font-serif text-5xl leading-tight text-chestnut md:text-6xl">
            Restyle the room you're standing in.
          </h1>
          <p className="mt-5 max-w-md text-lg text-brown-medium">
            Point your camera at any space. Talk through what you have. The stylist sees it,
            answers out loud, and helps you imagine what's next.
          </p>
          <div className="mt-8 flex gap-3">
            {loading ? null : user ? (
              <Button asChild size="lg">
                <Link to="/studio">Open Studio</Link>
              </Button>
            ) : (
              <Button size="lg" onClick={signInWithGoogle}>
                Sign in with Google
              </Button>
            )}
            {user && (
              <Button asChild variant="outline" size="lg">
                <Link to="/gallery">My looks</Link>
              </Button>
            )}
          </div>
        </div>
        <div className="relative">
          <div className="aspect-[4/5] rounded-2xl bg-gradient-to-br from-camel via-buff to-buff-light shadow-xl" />
          <div className="absolute -bottom-6 -left-6 max-w-xs rounded-xl border border-buff-dark/40 bg-off-white-1 p-4 shadow-md">
            <p className="font-serif text-lg text-chestnut">
              "That walnut credenza would love a pair of brass sconces above it."
            </p>
            <p className="mt-2 text-xs text-brown-medium">— the stylist, probably</p>
          </div>
        </div>
      </div>
    </div>
  );
}
