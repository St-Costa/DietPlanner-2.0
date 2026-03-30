import { json } from "../router";
import * as fs from "../services/fileService";
import { computeShoppingList } from "../services/shoppingListService";
import type { ListaSpesaInput } from "../types";

export async function handleListeSpesa(req: Request, url: URL, dataDir: string): Promise<Response> {
  const segments = url.pathname.split("/").filter(Boolean);
  // segments: ["api", "liste-spesa"] or ["api", "liste-spesa", id]
  const id = segments[2];

  // GET /api/liste-spesa
  if (req.method === "GET" && !id) {
    const liste = await fs.listListeSpesa(dataDir);
    liste.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return json(liste);
  }

  // GET /api/liste-spesa/:id
  if (req.method === "GET" && id) {
    const lista = await fs.getListaSpesa(dataDir, id);
    if (!lista) return json({ error: "Not found" }, 404);
    return json(lista);
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

    const { items, ricette, costoTotale } = await computeShoppingList(body.selezione, dataDir);
    const lista = await fs.createListaSpesa(dataDir, body, items, ricette, costoTotale);
    return json(lista, 201);
  }

  // DELETE /api/liste-spesa/:id
  if (req.method === "DELETE" && id) {
    const deleted = await fs.deleteListaSpesa(dataDir, id);
    if (!deleted) return json({ error: "Not found" }, 404);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
}
