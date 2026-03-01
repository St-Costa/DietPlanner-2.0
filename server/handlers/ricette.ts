import { json } from "../router";
import * as fs from "../services/fileService";
import { computeRicettaDettaglio, computeExtraAgg } from "../parsers/nutritionCalc";
import type { RicettaInput, RicettaFull, Ingrediente } from "../types";

async function enrichRicetta(
  dataDir: string,
  ricetta: Awaited<ReturnType<typeof fs.getRicetta>>
): Promise<RicettaFull | null> {
  if (!ricetta) return null;

  const allIng = await fs.listIngredienti(dataDir);
  const ingMap = new Map<string, Ingrediente>(allIng.map((i) => [i.id, i]));

  const { dettaglio, totale } = computeRicettaDettaglio(ricetta.ingredienti, ingMap);
  const extra = computeExtraAgg(ricetta.ingredienti, ingMap);

  return {
    ...ricetta,
    ingredientiDettaglio: dettaglio,
    nutrizione: totale,
    extra_nutrienti: Object.keys(extra).length > 0 ? extra : undefined,
  };
}

export async function handleRicette(req: Request, url: URL, dataDir: string): Promise<Response> {
  const segments = url.pathname.split("/").filter(Boolean);
  const id = segments[2];

  // GET /api/ricette
  if (req.method === "GET" && !id) {
    const all = await fs.listRicette(dataDir);
    const allIng = await fs.listIngredienti(dataDir);
    const ingMap = new Map<string, Ingrediente>(allIng.map((i) => [i.id, i]));

    const enriched: RicettaFull[] = all.map((r) => {
      const { dettaglio, totale } = computeRicettaDettaglio(r.ingredienti, ingMap);
      const extra = computeExtraAgg(r.ingredienti, ingMap);
      return {
        ...r,
        ingredientiDettaglio: dettaglio,
        nutrizione: totale,
        extra_nutrienti: Object.keys(extra).length > 0 ? extra : undefined,
      };
    });
    return json(enriched);
  }

  // GET /api/ricette/:id
  if (req.method === "GET" && id) {
    const r = await fs.getRicetta(dataDir, id);
    const enriched = await enrichRicetta(dataDir, r);
    if (!enriched) return json({ error: "Not found" }, 404);
    return json(enriched);
  }

  // POST /api/ricette
  if (req.method === "POST" && !id) {
    let body: RicettaInput;
    try {
      body = await req.json() as RicettaInput;
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const err = validateRicettaInput(body);
    if (err) return json({ error: err }, 400);

    const created = await fs.createRicetta(dataDir, body);
    const enriched = await enrichRicetta(dataDir, created);
    return json(enriched, 201);
  }

  // PUT /api/ricette/:id
  if (req.method === "PUT" && id) {
    let body: RicettaInput;
    try {
      body = await req.json() as RicettaInput;
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const err = validateRicettaInput(body);
    if (err) return json({ error: err }, 400);

    const updated = await fs.updateRicetta(dataDir, id, body);
    if (!updated) return json({ error: "Not found" }, 404);
    const enriched = await enrichRicetta(dataDir, updated);
    return json(enriched);
  }

  // DELETE /api/ricette/:id
  if (req.method === "DELETE" && id) {
    await fs.removeRicettaFromGiornate(dataDir, id);
    const deleted = await fs.deleteRicetta(dataDir, id);
    if (!deleted) return json({ error: "Not found" }, 404);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
}

function validateRicettaInput(body: RicettaInput): string | null {
  if (!body.nome?.trim()) return "nome è obbligatorio";
  if (!Array.isArray(body.ingredienti)) return "ingredienti deve essere un array";
  for (const ing of body.ingredienti) {
    if (!ing.id?.trim()) return "ogni ingrediente deve avere un id";
    if (typeof ing.quantita !== "number" || ing.quantita <= 0) {
      return "ogni ingrediente deve avere una quantita > 0";
    }
    if (!ing.unita?.trim()) return "ogni ingrediente deve avere una unita";
  }
  return null;
}
