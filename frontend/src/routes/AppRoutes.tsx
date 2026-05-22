import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/contexts/AuthContext";

const Landing = lazy(() => import("@/pages/Landing"));
const Gallery = lazy(() => import("@/pages/Gallery"));
const DesignFlow = lazy(() => import("@/pages/design/DesignFlow"));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Fallback />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Fallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center text-brown-medium">Loading…</div>
  );
}

function ChromeHeader() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/design")) return null;
  return <Header />;
}

export default function AppRoutes() {
  return (
    <>
      <ChromeHeader />
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/design"
            element={
              <RequireAuth>
                <DesignFlow />
              </RequireAuth>
            }
          />
          <Route path="/studio" element={<Navigate to="/design" replace />} />
          <Route
            path="/gallery"
            element={
              <RequireAuth>
                <Gallery />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
