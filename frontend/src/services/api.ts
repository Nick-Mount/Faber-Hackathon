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

export const api = {
  listLooks: () => request<{ looks: Look[] }>("/api/looks"),
  getLook: (id: string) => request<{ look: Look }>(`/api/looks/${id}`),
  saveLook: (body: { title: string; thumbnail: string; suggestion: string; transcript: string }) =>
    request<{ look: Look }>("/api/looks", { method: "POST", body: JSON.stringify(body) }),
  deleteLook: (id: string) => request<{ ok: true }>(`/api/looks/${id}`, { method: "DELETE" }),
};
