import { firebaseAuth } from "@/lib/firebase";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function authHeader(): Promise<Record<string, string>> {
  const u = firebaseAuth.currentUser;
  if (!u) return {};
  const token = await u.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    ...(await authHeader()),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

export interface Look {
  id: string;
  title: string;
  thumbnail: string;
  suggestion: string;
  transcript?: string;
  createdAt: string;
}

export interface MeshyModelUrls {
  glb?: string;
  fbx?: string;
  obj?: string;
  mtl?: string;
  usdz?: string;
}

export type MeshyStatus = "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED" | "EXPIRED";

export interface MeshyTask {
  taskId: string;
  status: MeshyStatus;
  progress: number;
  modelUrls: MeshyModelUrls | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  taskError: { message?: string } | null;
}

export const api = {
  listLooks: () => request<{ looks: Look[] }>("/api/looks"),
  getLook: (id: string) => request<{ look: Look }>(`/api/looks/${id}`),
  saveLook: (body: { title: string; thumbnail: string; suggestion: string; transcript: string }) =>
    request<{ look: Look }>("/api/looks", { method: "POST", body: JSON.stringify(body) }),
  deleteLook: (id: string) => request<{ ok: true }>(`/api/looks/${id}`, { method: "DELETE" }),
  startImageTo3d: (imageUrl: string) =>
    request<{ taskId: string }>("/api/meshy/image-to-3d", {
      method: "POST",
      body: JSON.stringify({ imageUrl }),
    }),
  getMeshyTask: (taskId: string) => request<MeshyTask>(`/api/meshy/image-to-3d/${taskId}`),
};
