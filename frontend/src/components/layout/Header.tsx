import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={cn(
        "text-sm transition-colors",
        pathname === to ? "text-chestnut" : "text-brown-medium hover:text-chestnut",
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-buff-dark/40 bg-off-white-1/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="font-serif text-2xl text-chestnut tracking-tight">
          RoomStylist
        </Link>
        <nav className="flex items-center gap-6">
          {user && navLink("/studio", "Studio")}
          {user && navLink("/gallery", "Gallery")}
          {user ? (
            <div className="flex items-center gap-3">
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="size-7 rounded-full" />
              )}
              <Button variant="ghost" size="sm" onClick={logout}>
                Sign out
              </Button>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
