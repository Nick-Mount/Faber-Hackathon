import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  const looks = await prisma.look.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      thumbnail: true,
      suggestion: true,
      createdAt: true,
    },
  });
  res.json({ looks });
});

router.get("/:id", async (req, res) => {
  const look = await prisma.look.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!look) return res.status(404).json({ error: "Not found" });
  res.json({ look });
});

router.post("/", async (req, res) => {
  const { title, thumbnail, suggestion, transcript } = req.body ?? {};
  if (typeof thumbnail !== "string" || !thumbnail.startsWith("data:image/")) {
    return res.status(400).json({ error: "thumbnail must be a data URL" });
  }
  if (thumbnail.length > 2_000_000) {
    return res.status(413).json({ error: "thumbnail too large (max ~1.5MB encoded)" });
  }
  const look = await prisma.look.create({
    data: {
      userId: req.userId!,
      title: (title || "Untitled look").toString().slice(0, 120),
      thumbnail,
      suggestion: (suggestion || "").toString().slice(0, 8000),
      transcript: (transcript || "").toString().slice(0, 16000),
    },
  });
  res.status(201).json({ look });
});

router.delete("/:id", async (req, res) => {
  const result = await prisma.look.deleteMany({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (result.count === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default router;
