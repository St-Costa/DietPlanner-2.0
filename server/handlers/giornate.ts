import { json } from "../router";
import * as fs from "../services/fileService";
import { sumNutrition, zeroNutrition } from "../parsers/nutritionCalc";
import { computeRicettaDettaglio } from "../parsers/nutritionCalc";
import type { GiornataInput, GiornataFull, GiornataRicettaDettaglio, Ingrediente } from "../types";

async function enrichGiornata(
  dataDir: string,
  giornata: Awaited<ReturnType<typeof fs.getGiornata>>
): Promise<GiornataFull | null> {
  if (!giornata) return null;

  const allIng = await fs.listIngredienti(dataDir);
  const ingMap = new Map<string, Ingrediente>(allIng.map((i) => [i.id, i]));

  const ricetteDettaglio: GiornataRicettaDettaglio[] = [];

  for (const ricettaId of giornata.ricette) {
    const ricetta = await fs.getRicetta(dataDir, ricettaId);
    if (!ricetta) {
      ricetteDettaglio.push({
        id: ricettaId,
        nome: `[non trovata: ${ricettaId}]`,
        nutrizione: zeroNutrition(),
      });
      continue;
    }
    const { totale } = computeRicettaDettaglio(ricetta.ingredienti, ingMap);
    ricetteDettaglio.push({ id: ricettaId, nome: ricetta.nome, nutrizione: totale });
  }

  const totale = sumNutrition(ricetteDettaglio.map((r) => r.nutrizione));

  return { ...giornata, ricetteDettaglio, totale };
}

export async function handleGiornate(req: Request, url: URL, dataDir: string): Promise<Response> {
  const segments = url.pathname.split("/").filter(Boolean);
  const id = segments[2];

  // GET /api/giornate
  if (req.method === "GET" && !id) {
    const all = await fs.listGiornate(dataDir);
    const enriched = await Promise.all(all.map((g) => enrichGiornata(dataDir, g)));
    return json(enriched);
  }

  // GET /api/giornate/:id
  if (req.method === "GET" && id) {
    const g = await fs.getGiornata(dataDir, id);
    const enriched = await enrichGiornata(dataDir, g);
    if (!enriched) return json({ error: "Not found" }, 404);
    return json(enriched);
  }

  // POST /api/giornate
  if (req.method === "POST" && !id) {
    let body: GiornataInput;
    try {
      body = await req.json() as GiornataInput;
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const err = validateGiornataInput(body);
    if (err) return json({ error: err }, 400);

    const created = await fs.createGiornata(dataDir, body);
    const enriched = await enrichGiornata(dataDir, created);
    return json(enriched, 201);
  }

  // PUT /api/giornate/:id
  if (req.method === "PUT" && id) {
    let body: GiornataInput;
    try {
      body = await req.json() as GiornataInput;
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const err = validateGiornataInput(body);
    if (err) return json({ error: err }, 400);

    const updated = await fs.updateGiornata(dataDir, id, body);
    if (!updated) return json({ error: "Not found" }, 404);
    const enriched = await enrichGiornata(dataDir, updated);
    return json(enriched);
  }

  // DELETE /api/giornate/:id
  if (req.method === "DELETE" && id) {
    const deleted = await fs.deleteGiornata(dataDir, id);
    if (!deleted) return json({ error: "Not found" }, 404);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
}

function validateGiornataInput(body: GiornataInput): string | null {
  if (!body.nome?.trim()) return "nome è obbligatorio";
  if (!Array.isArray(body.ricette)) return "ricette deve essere un array";
  return null;
}
