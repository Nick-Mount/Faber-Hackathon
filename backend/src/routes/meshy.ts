import { Router } from "express";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

const MESHY_BASE = "https://api.meshy.ai/openapi/v1";

function apiKey(): string {
  const key = process.env.MESHY_API_KEY;
  if (!key) throw new Error("MESHY_API_KEY not configured");
  return key;
}

router.post("/image-to-3d", async (req, res) => {
  const { imageUrl, enablePbr, aiModel } = req.body ?? {};
  if (typeof imageUrl !== "string" || imageUrl.length < 16) {
    return res.status(400).json({ error: "imageUrl required" });
  }

  try {
    const r = await fetch(`${MESHY_BASE}/image-to-3d`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
        ai_model: aiModel ?? "meshy-6",
        enable_pbr: enablePbr ?? true,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res
        .status(r.status)
        .json({ error: (data as any)?.message ?? "Meshy request failed", details: data });
    }
    // Meshy returns { result: "<taskId>" } on the create endpoint.
    const taskId = (data as any).result ?? (data as any).id;
    if (!taskId) {
      return res.status(502).json({ error: "Meshy did not return a task id", details: data });
    }
    res.status(201).json({ taskId });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Meshy error" });
  }
});

router.get("/image-to-3d/:taskId", async (req, res) => {
  const { taskId } = req.params;
  try {
    const r = await fetch(`${MESHY_BASE}/image-to-3d/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey()}` },
    });
    const data: any = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res
        .status(r.status)
        .json({ error: data?.message ?? "Meshy poll failed", details: data });
    }
    res.json({
      taskId: data.id,
      status: data.status,
      progress: data.progress ?? 0,
      modelUrls: data.model_urls ?? null,
      thumbnailUrl: data.thumbnail_url ?? null,
      videoUrl: data.video_url ?? null,
      taskError: data.task_error ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Meshy error" });
  }
});

export default router;
