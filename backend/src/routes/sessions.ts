import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();
router.use(authenticate);

const MESHY_BASE = "https://api.meshy.ai/openapi/v1";
const MAX_THUMB_LEN = 2_000_000;
const MAX_GLB_BYTES = 25 * 1024 * 1024;

const listSelect = {
  id: true,
  title: true,
  thumbnail: true,
  prompt: true,
  suggestion: true,
  currentStep: true,
  meshTaskId: true,
  meshStatus: true,
  meshThumbnailUrl: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

router.get("/", async (req, res) => {
  const sessions = await prisma.session.findMany({
    where: { userId: req.userId! },
    orderBy: { updatedAt: "desc" },
    select: listSelect,
  });
  res.json({ sessions });
});

router.get("/:id", async (req, res) => {
  const row = await prisma.session.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    select: { ...listSelect, transcript: true },
  });
  if (!row) return res.status(404).json({ error: "Not found" });
  const meshSize = await prisma.$queryRaw<{ size: number | null }[]>`
    SELECT octet_length(mesh_glb) AS size FROM sessions WHERE id = ${row.id}
  `;
  const meshBytes = Number(meshSize?.[0]?.size ?? 0);
  res.json({ session: { ...row, hasMesh: meshBytes > 0, meshBytes } });
});

router.get("/:id/mesh", async (req, res) => {
  const row = await prisma.session.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    select: { meshGlb: true },
  });
  if (!row?.meshGlb) return res.status(404).json({ error: "No mesh stored" });
  res.setHeader("Content-Type", "model/gltf-binary");
  res.setHeader("Content-Length", String(row.meshGlb.length));
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.send(row.meshGlb);
});

router.post("/", async (req, res) => {
  const { title, thumbnail, prompt, suggestion, transcript } = req.body ?? {};
  if (typeof thumbnail !== "string" || !thumbnail.startsWith("data:image/")) {
    return res.status(400).json({ error: "thumbnail must be a data URL" });
  }
  if (thumbnail.length > MAX_THUMB_LEN) {
    return res.status(413).json({ error: "thumbnail too large" });
  }
  const session = await prisma.session.create({
    data: {
      userId: req.userId!,
      title: (title || "Untitled session").toString().slice(0, 120),
      thumbnail,
      prompt: typeof prompt === "string" ? prompt.slice(0, 2000) : null,
      suggestion: typeof suggestion === "string" ? suggestion.slice(0, 8000) : null,
      transcript: typeof transcript === "string" ? transcript.slice(0, 16000) : null,
    },
    select: listSelect,
  });
  res.status(201).json({ session });
});

router.patch("/:id", async (req, res) => {
  const { title, prompt, suggestion, transcript, thumbnail, currentStep, completed } =
    req.body ?? {};

  const updates: Record<string, unknown> = {};
  if (typeof title === "string") updates.title = title.slice(0, 120);
  if (typeof prompt === "string") updates.prompt = prompt.slice(0, 2000);
  if (typeof suggestion === "string") updates.suggestion = suggestion.slice(0, 8000);
  if (typeof transcript === "string") updates.transcript = transcript.slice(0, 16000);
  if (typeof thumbnail === "string" && thumbnail.startsWith("data:image/")) {
    if (thumbnail.length > MAX_THUMB_LEN) {
      return res.status(413).json({ error: "thumbnail too large" });
    }
    updates.thumbnail = thumbnail;
  }
  if (typeof currentStep === "number") {
    updates.currentStep = Math.max(1, Math.min(4, Math.floor(currentStep)));
  }
  if (completed === true) updates.completedAt = new Date();

  const result = await prisma.session.updateMany({
    where: { id: req.params.id, userId: req.userId! },
    data: updates,
  });
  if (result.count === 0) return res.status(404).json({ error: "Not found" });
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    select: listSelect,
  });
  res.json({ session });
});

router.post("/:id/mesh", async (req, res) => {
  const { taskId } = req.body ?? {};
  if (typeof taskId !== "string" || !taskId) {
    return res.status(400).json({ error: "taskId required" });
  }
  const owned = await prisma.session.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    select: { id: true },
  });
  if (!owned) return res.status(404).json({ error: "Not found" });

  const key = process.env.MESHY_API_KEY;
  if (!key) return res.status(500).json({ error: "MESHY_API_KEY not configured" });

  const taskRes = await fetch(`${MESHY_BASE}/image-to-3d/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const taskData: any = await taskRes.json().catch(() => ({}));
  if (!taskRes.ok) {
    return res.status(taskRes.status).json({ error: "Meshy poll failed", details: taskData });
  }

  if (taskData.status !== "SUCCEEDED") {
    await prisma.session.update({
      where: { id: owned.id },
      data: {
        meshTaskId: taskId,
        meshStatus: taskData.status,
        meshThumbnailUrl: taskData.thumbnail_url ?? null,
      },
    });
    return res.status(409).json({ error: "Mesh task not succeeded", status: taskData.status });
  }

  const glbUrl: string | undefined = taskData?.model_urls?.glb;
  if (!glbUrl) return res.status(502).json({ error: "Meshy returned no GLB url" });

  const fileRes = await fetch(glbUrl);
  if (!fileRes.ok) {
    return res.status(502).json({ error: "GLB download failed", status: fileRes.status });
  }
  const declared = Number(fileRes.headers.get("content-length") ?? 0);
  if (declared && declared > MAX_GLB_BYTES) {
    return res.status(413).json({ error: "GLB too large" });
  }
  const buf = Buffer.from(await fileRes.arrayBuffer());
  if (buf.length > MAX_GLB_BYTES) {
    return res.status(413).json({ error: "GLB too large" });
  }

  const session = await prisma.session.update({
    where: { id: owned.id },
    data: {
      meshTaskId: taskId,
      meshStatus: "SUCCEEDED",
      meshGlb: buf,
      meshThumbnailUrl: taskData.thumbnail_url ?? null,
    },
    select: listSelect,
  });
  res.json({ session, meshBytes: buf.length });
});

router.delete("/:id", async (req, res) => {
  const result = await prisma.session.deleteMany({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (result.count === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default router;
