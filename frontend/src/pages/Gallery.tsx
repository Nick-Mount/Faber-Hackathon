import { useEffect, useState } from "react";
import { api, type Look } from "@/services/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function GalleryPage() {
  const [looks, setLooks] = useState<Look[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.listLooks();
      setLooks(res.looks);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    await api.deleteLook(id);
    setLooks((prev) => prev?.filter((l) => l.id !== id) ?? null);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-2 font-serif text-4xl text-chestnut">Saved looks</h1>
      <p className="mb-8 text-brown-medium">Snapshots from your styling sessions.</p>

      {err && <p className="text-destructive">{err}</p>}
      {looks === null && !err && <p className="text-muted-foreground">Loading…</p>}
      {looks && looks.length === 0 && (
        <p className="text-brown-medium">
          No looks yet. Open the studio and tap <span className="font-medium">Save look</span>.
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {looks?.map((look) => (
          <Card key={look.id} className="overflow-hidden">
            <img src={look.thumbnail} alt={look.title} className="aspect-[4/3] w-full object-cover" />
            <div className="space-y-2 p-4">
              <h3 className="font-serif text-lg text-chestnut">{look.title}</h3>
              <p className="line-clamp-3 text-sm text-brown-medium">{look.suggestion}</p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(look.createdAt).toLocaleDateString()}
                </span>
                <Button variant="ghost" size="sm" onClick={() => remove(look.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
