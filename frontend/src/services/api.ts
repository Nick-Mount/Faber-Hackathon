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
    ...(init.body && !(init.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
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

export interface SessionSummary {
  id: string;
  title: string;
  thumbnail: string;
  prompt: string | null;
  suggestion: string | null;
  currentStep: number;
  meshTaskId: string | null;
  meshStatus: string | null;
  meshThumbnailUrl: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlbumEntry {
  data: string;
  prompt: string | null;
}

export interface SessionDetail extends SessionSummary {
  transcript: string | null;
  meshImage: string | null;
  renderedImages: AlbumEntry[] | null;
  hasMesh: boolean;
  meshBytes: number;
}

export interface MeshyModelUrls {
  glb?: string;
  fbx?: string;
  obj?: string;
  mtl?: string;
  usdz?: string;
}

export type MeshyStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED"
  | "EXPIRED";

export interface MeshyTask {
  taskId: string;
  status: MeshyStatus;
  progress: number;
  modelUrls: MeshyModelUrls | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  taskError: { message?: string } | null;
}

export interface CreateSessionBody {
  title?: string;
  thumbnail: string;
  meshImage?: string | null;
  prompt?: string | null;
  suggestion?: string | null;
  transcript?: string | null;
  renderedImages?: AlbumEntry[];
}

export interface PatchSessionBody {
  title?: string;
  prompt?: string;
  suggestion?: string;
  transcript?: string;
  thumbnail?: string;
  meshImage?: string;
  renderedImages?: AlbumEntry[];
  currentStep?: number;
  completed?: boolean;
}

export const api = {
  listSessions: () => request<{ sessions: SessionSummary[] }>("/api/sessions"),
  getSession: (id: string) => request<{ session: SessionDetail }>(`/api/sessions/${id}`),
  createSession: (body: CreateSessionBody) =>
    request<{ session: SessionSummary }>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchSession: (id: string, body: PatchSessionBody) =>
    request<{ session: SessionSummary }>(`/api/sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  saveSessionMesh: (id: string, taskId: string) =>
    request<{ session: SessionSummary; meshBytes: number }>(
      `/api/sessions/${id}/mesh`,
      { method: "POST", body: JSON.stringify({ taskId }) },
    ),
  deleteSession: (id: string) =>
    request<{ ok: true }>(`/api/sessions/${id}`, { method: "DELETE" }),

  async getMeshBlobUrl(id: string): Promise<string> {
    const res = await fetch(`${BASE}/api/sessions/${id}/mesh`, {
      headers: await authHeader(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text}`);
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  startImageTo3d: (imageUrl: string) =>
    request<{ taskId: string }>("/api/meshy/image-to-3d", {
      method: "POST",
      body: JSON.stringify({ imageUrl }),
    }),
  getMeshyTask: (taskId: string) =>
    request<MeshyTask>(`/api/meshy/image-to-3d/${taskId}`),
};
