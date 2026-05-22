import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import authRoutes from "./routes/auth";
import looksRoutes from "./routes/looks";
import { attachLiveProxy } from "./ws/liveProxy";

const app = express();

const allowed = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: allowed, credentials: true }));
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/looks", looksRoutes);

const server = http.createServer(app);
attachLiveProxy(server);

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`[roomstylist] listening on :${port}`);
});
