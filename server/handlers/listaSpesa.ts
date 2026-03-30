import { json } from "../router";
import * as fs from "../services/fileService";
import { computeShoppingList } from "../services/shoppingListService";
import type { ListaSpesaInput, ListaSpesa, ListaSpesaRaw } from "../types";

async function enrichListaSpesa(raw: ListaSpesaRaw, dataDir: string): Promise<ListaSpesa> {
  const { items, ricette, costoTotale } = await computeShoppingList(raw.selezione, dataDir);
  return { ...raw, items, ricette, costoTotale };
}

export async function handleListeSpesa(req: Request, url: URL, dataDir: string): Promise<Response> {
  const segments = url.pathname.split("/").filter(Boolean);
  const id = segments[2];

  // GET /api/liste-spesa
  if (req.method === "GET" && !id) {
    const rawList = await fs.listListeSpesa(dataDir);
    rawList.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const liste = await Promise.all(rawList.map((r) => enrichListaSpesa(r, dataDir)));
    return json(liste);
  }

  // GET /api/liste-spesa/:id
  if (req.method === "GET" && id) {
    const raw = await fs.getListaSpesa(dataDir, id);
    if (!raw) return json({ error: "Not found" }, 404);
    return json(await enrichListaSpesa(raw, dataDir));
  }

  // POST /api/liste-spesa
  if (req.method === "POST" && !id) {
    let body: ListaSpesaInput;
    try {
      body = await req.json() as ListaSpesaInput;
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    if (!Array.isArray(body.selezione) || body.selezione.length === 0) {
      return json({ error: "selezione deve contenere almeno una giornata" }, 400);
    }

    const raw = await fs.createListaSpesa(dataDir, body);
    return json(await enrichListaSpesa(raw, dataDir), 201);
  }

  // DELETE /api/liste-spesa/:id
  if (req.method === "DELETE" && id) {
    const deleted = await fs.deleteListaSpesa(dataDir, id);
    if (!deleted) return json({ error: "Not found" }, 404);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
}
