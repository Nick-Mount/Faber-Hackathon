import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function Header() {
  const { user, signInWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = user
    ? [
        { label: "Design", to: "/design" },
        { label: "Gallery", to: "/gallery" },
      ]
    : [];

  const userInitials = (() => {
    if (!user) return "";
    const name = user.displayName ?? user.email ?? "?";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  })();

  return (
    <header
      className="fixed left-0 right-0 top-0 z-50 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-4 md:py-8 bg-[#D9D3CA]/80 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Link
            to="https://www.fabermark.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 sm:gap-4 hover:opacity-80 transition-opacity"
          >
            <img
              src="/logo_black.svg"
              alt="Faber"
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
            />
            <div className="flex items-start gap-1.5 sm:gap-2">
              <div>
                <div className="text-[#4A4036] text-xl sm:text-2xl md:text-3xl tracking-[0.2em] font-light">
                  FABER
                </div>
                <div
                  className="text-[#78583C] text-[8px] sm:text-[10px] uppercase hidden sm:block"
                  style={{
                    letterSpacing: "0.385em",
                    textAlign: "justify",
                    textAlignLast: "justify",
                    width: "100%",
                  }}
                >
                  Make it real
                </div>
              </div>
              <span className="mt-[5px] sm:mt-[7px] md:mt-[10px] px-1 py-[1px] text-[7px] sm:text-[8px] font-semibold uppercase tracking-[0.1em] text-[#78583C] border border-[#78583C]/40 rounded leading-none">
                Beta
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-6 md:gap-4 lg:gap-8 xl:gap-10">
          <nav className="hidden md:flex items-center gap-4 lg:gap-8 xl:gap-12">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`transition-colors text-sm tracking-wider uppercase ${
                  pathname === link.to
                    ? "text-[#78583C]"
                    : "text-[#4A4036] hover:text-[#78583C]"
                }`}
              >
                {link.label}
              </Link>
            ))}
            
          </nav>

          <div className="hidden md:flex items-center">
            {!user ? (
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="text-[#4A4036] hover:text-[#78583C] transition-colors text-sm tracking-wider uppercase cursor-pointer"
              >
                Sign In
              </button>
            ) : (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 cursor-pointer"
                  aria-label="Account menu"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover border border-[#78583C]/30"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#DEC8AB] flex items-center justify-center text-[#4A4036] text-sm">
                      {userInitials || "?"}
                    </div>
                  )}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-3 w-56 overflow-hidden rounded-xl border border-[#E2DCD4] bg-[#FDFDFC] shadow-lg">
                    <div className="px-4 py-3 border-b border-[#E2DCD4]">
                      <div className="text-sm text-[#4A4036] truncate">
                        {user.displayName ?? "Signed in"}
                      </div>
                      {user.email && (
                        <div className="text-xs text-[#78583C] truncate">{user.email}</div>
                      )}
                    </div>
                    <Link
                      to="/gallery"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-3 text-sm tracking-wider text-[#4A4036] hover:bg-[#F1EDE9] transition-colors"
                    >
                      Gallery
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await logout();
                        navigate("/");
                      }}
                      className="block w-full text-left px-4 py-3 text-sm tracking-wider text-[#4A4036] hover:bg-[#F1EDE9] transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg bg-[#F5F1ED] hover:bg-[#E8E3DC] transition-colors cursor-pointer"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-[#4A4036]" />
            ) : (
              <Menu className="w-6 h-6 text-[#4A4036]" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#F5F1ED] shadow-2xl border-t border-[#D9D3CA]">
          <div className="p-4 space-y-1">
            {user && (
              <div className="flex items-center gap-3 px-4 py-3 mb-2 border-b border-[#D9D3CA] pb-4">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#DEC8AB] flex items-center justify-center text-[#4A4036] text-sm">
                    {userInitials || "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm text-[#4A4036] truncate">
                    {user.displayName ?? "Signed in"}
                  </div>
                  {user.email && (
                    <div className="text-xs text-[#78583C] truncate">{user.email}</div>
                  )}
                </div>
              </div>
            )}

            <nav className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-left px-4 py-3 rounded-lg text-[#4A4036] hover:bg-[#E8E3DC] transition-colors text-sm tracking-wider uppercase"
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="https://www.fabermark.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="text-left px-4 py-3 rounded-lg text-[#4A4036] hover:bg-[#E8E3DC] transition-colors text-sm tracking-wider uppercase"
              >
                Faber.com
              </a>

              {!user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void signInWithGoogle();
                  }}
                  className="text-left px-4 py-3 rounded-lg bg-[#DEC8AB] hover:bg-[#E5D3BC] text-[#4A4036] transition-colors text-sm tracking-wider uppercase cursor-pointer"
                >
                  Sign In
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                    navigate("/");
                  }}
                  className="text-left px-4 py-3 rounded-lg text-[#4A4036] hover:bg-[#E8E3DC] transition-colors text-sm tracking-wider uppercase cursor-pointer"
                >
                  Sign Out
                </button>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
