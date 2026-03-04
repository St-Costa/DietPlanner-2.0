import { json } from "../router";
import * as fs from "../services/fileService";
import type { IngredienteInput } from "../types";

export async function handleIngredienti(req: Request, url: URL, dataDir: string): Promise<Response> {
  const segments = url.pathname.split("/").filter(Boolean);
  // segments: ["api", "ingredienti"] or ["api", "ingredienti", id]
  const id = segments[2];

  // GET /api/ingredienti/tipi
  if (req.method === "GET" && id === "tipi") {
    const all = await fs.listIngredienti(dataDir);
    const tipi = [...new Set(all.map((i) => i.tipo).filter(Boolean))].sort();
    return json(tipi);
  }

  // GET /api/ingredienti
  if (req.method === "GET" && !id) {
    const all = await fs.listIngredienti(dataDir);
    return json(all);
  }

  // GET /api/ingredienti/:id
  if (req.method === "GET" && id) {
    const ing = await fs.getIngrediente(dataDir, id);
    if (!ing) return json({ error: "Not found" }, 404);
    return json(ing);
  }

  // POST /api/ingredienti
  if (req.method === "POST" && !id) {
    let body: IngredienteInput;
    try {
      body = await req.json() as IngredienteInput;
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const err = validateIngredienteInput(body);
    if (err) return json({ error: err }, 400);

    const created = await fs.createIngrediente(dataDir, body);
    return json(created, 201);
  }

  // PUT /api/ingredienti/:id
  if (req.method === "PUT" && id) {
    let body: IngredienteInput;
    try {
      body = await req.json() as IngredienteInput;
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const err = validateIngredienteInput(body);
    if (err) return json({ error: err }, 400);

    // Check if switching to unit-based on an ingredient already used in recipes
    const existing = await fs.getIngrediente(dataDir, id);
    if (existing && !existing.nome_unita && body.nome_unita) {
      const usedInIds = await fs.ricetteUsingIngrediente(dataDir, id);
      const forceHeader = req.headers.get("x-force-unit-toggle");
      if (usedInIds.length > 0 && !forceHeader) {
        const allRicette = await fs.listRicette(dataDir);
        const ricetteMap = new Map(allRicette.map((r) => [r.id, r.nome]));
        const affectedNames = usedInIds.map((rid) => ricetteMap.get(rid) ?? rid);
        return json({
          warning: "unitToggleAffects",
          affectedRecipes: affectedNames,
        }, 409);
      }
    }

    const updated = await fs.updateIngrediente(dataDir, id, body);
    if (!updated) return json({ error: "Not found" }, 404);
    return json(updated);
  }

  // DELETE /api/ingredienti/:id
  if (req.method === "DELETE" && id) {
    await fs.removeIngredienteFromRicette(dataDir, id);
    const deleted = await fs.deleteIngrediente(dataDir, id);
    if (!deleted) return json({ error: "Not found" }, 404);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
}

function validateIngredienteInput(body: IngredienteInput): string | null {
  if (!body.nome?.trim()) return "nome è obbligatorio";
  if (!body.tipo?.trim()) return "tipo è obbligatorio";
  const numericFields = ["kcal", "proteine", "fibre", "grassi", "saturi", "carboidrati", "zuccheri", "sodio", "colesterolo"] as const;
  for (const field of numericFields) {
    if (typeof body[field] !== "number" || isNaN(body[field])) {
      return `${field} deve essere un numero`;
    }
  }
  // Optional: nome_unita requires peso_unita
  if (body.nome_unita && !body.peso_unita) {
    return "peso_unita è obbligatorio quando nome_unita è specificato";
  }
  return null;
}
