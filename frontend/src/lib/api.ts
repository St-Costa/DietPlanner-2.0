import type {
  Ingrediente, IngredienteInput,
  RicettaFull, RicettaInput,
  GiornataFull, GiornataInput,
  ShoppingListSelezione, SlugifyResponse,
} from "./types";

// In production, API is on same origin. In dev, Vite proxies /api to localhost:3000
const BASE = "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const err = new ApiError(res.status, body);
    throw err;
  }
  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>
  ) {
    super(`API Error ${status}`);
  }
}

// ─── Ingredienti ─────────────────────────────────────────────────────────────

export const api = {
  ingredienti: {
    list: () => request<Ingrediente[]>("/api/ingredienti"),
    tipi: () => request<string[]>("/api/ingredienti/tipi"),
    get: (id: string) => request<Ingrediente>(`/api/ingredienti/${id}`),
    create: (body: IngredienteInput) =>
      request<Ingrediente>("/api/ingredienti", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: IngredienteInput, forceUnitToggle = false) =>
      request<Ingrediente>(`/api/ingredienti/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
        headers: forceUnitToggle ? { "x-force-unit-toggle": "true" } : {},
      }),
    delete: (id: string, force = false) =>
      request<{ ok: true }>(`/api/ingredienti/${id}`, {
        method: "DELETE",
        headers: force ? { "x-force-delete": "true" } : {},
      }),
  },

  ricette: {
    list: () => request<RicettaFull[]>("/api/ricette"),
    get: (id: string) => request<RicettaFull>(`/api/ricette/${id}`),
    create: (body: RicettaInput) =>
      request<RicettaFull>("/api/ricette", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: RicettaInput) =>
      request<RicettaFull>(`/api/ricette/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: string, force = false) =>
      request<{ ok: true }>(`/api/ricette/${id}`, {
        method: "DELETE",
        headers: force ? { "x-force-delete": "true" } : {},
      }),
  },

  giornate: {
    list: () => request<GiornataFull[]>("/api/giornate"),
    get: (id: string) => request<GiornataFull>(`/api/giornate/${id}`),
    create: (body: GiornataInput) =>
      request<GiornataFull>("/api/giornate", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: GiornataInput) =>
      request<GiornataFull>(`/api/giornate/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: string) =>
      request<{ ok: true }>(`/api/giornate/${id}`, { method: "DELETE" }),
  },

  slugify: (nome: string, tipo: "ingrediente" | "ricetta" | "giornata") =>
    request<SlugifyResponse>(`/api/slugify?nome=${encodeURIComponent(nome)}&tipo=${tipo}`),

  listaSpesa: {
    genera: async (selezione: ShoppingListSelezione[]): Promise<string> => {
      const res = await fetch("/api/lista-spesa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selezione }),
      });
      if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})));
      return res.text();
    },
  },
};
