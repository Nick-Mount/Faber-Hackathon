import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type SessionSummary } from "@/services/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Box, Trash2, ArrowRight } from "lucide-react";

const STEP_LABELS = ["Describe", "Model", "Place", "Commission"];

export default function GalleryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.listSessions();
      setSessions(res.sessions);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    await api.deleteSession(id);
    setSessions((prev) => prev?.filter((s) => s.id !== id) ?? null);
  }

  function resume(id: string) {
    navigate(`/design?session=${id}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 sm:px-10 pt-32 sm:pt-40 pb-16">
      <h1 className="mb-2 font-serif text-4xl text-chestnut">Saved sessions</h1>
      <p className="mb-8 text-brown-medium">Pick up where you left off.</p>

      {err && <p className="text-destructive">{err}</p>}
      {sessions === null && !err && <p className="text-muted-foreground">Loading…</p>}
      {sessions && sessions.length === 0 && (
        <p className="text-brown-medium">
          No sessions yet. Start a design and we'll save it as you go.
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sessions?.map((s) => {
          const hasMesh = s.meshStatus === "SUCCEEDED";
          const stepLabel = STEP_LABELS[Math.max(0, Math.min(STEP_LABELS.length - 1, s.currentStep - 1))];
          const completed = !!s.completedAt;
          return (
            <Card
              key={s.id}
              className="overflow-hidden cursor-pointer transition hover:shadow-md focus-within:shadow-md"
              onClick={() => resume(s.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  resume(s.id);
                }
              }}
            >
              <img src={s.thumbnail} alt={s.title} className="aspect-[4/3] w-full object-cover" />
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-lg text-chestnut">{s.title}</h3>
                  {hasMesh && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E4ECDB] px-2 py-0.5 text-xs text-[#4F6541]">
                      <Box className="size-3" /> 3D
                    </span>
                  )}
                </div>
                <p className="line-clamp-3 text-sm text-brown-medium">
                  {s.suggestion || s.prompt || ""}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    {completed ? "Completed" : `Step ${s.currentStep} · ${stepLabel}`} ·{" "}
                    {new Date(s.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => resume(s.id)}>
                      {completed ? "Open" : "Resume"}
                      <ArrowRight className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(s.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
