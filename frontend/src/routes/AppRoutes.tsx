import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/contexts/AuthContext";

const Landing = lazy(() => import("@/pages/Landing"));
const Studio = lazy(() => import("@/pages/Studio"));
const Gallery = lazy(() => import("@/pages/Gallery"));

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

export default function AppRoutes() {
  return (
    <>
      <Header />
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/studio"
            element={
              <RequireAuth>
                <Studio />
              </RequireAuth>
            }
          />
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
