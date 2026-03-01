import { json } from "../router";
import * as fs from "../services/fileService";
import { computeRicettaDettaglio } from "../parsers/nutritionCalc";
import { generateShoppingListHtml } from "../services/shoppingListService";
import type { ShoppingListInput, ShoppingListItem, Ingrediente } from "../types";

export async function handleListaSpesa(req: Request, dataDir: string): Promise<Response> {
  let body: ShoppingListInput;
  try {
    body = await req.json() as ShoppingListInput;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!Array.isArray(body.selezione) || body.selezione.length === 0) {
    return json({ error: "selezione deve contenere almeno una giornata" }, 400);
  }

  const allIng = await fs.listIngredienti(dataDir);
  const ingMap = new Map<string, Ingrediente>(allIng.map((i) => [i.id, i]));

  // Map: ingredienteId → total grams
  const totali = new Map<string, number>();

  for (const { giornataId, moltiplicatore } of body.selezione) {
    if (!moltiplicatore || moltiplicatore <= 0) continue;

    const giornata = await fs.getGiornata(dataDir, giornataId);
    if (!giornata) continue;

    for (const ricettaId of giornata.ricette) {
      const ricetta = await fs.getRicetta(dataDir, ricettaId);
      if (!ricetta) continue;

      const { dettaglio } = computeRicettaDettaglio(ricetta.ingredienti, ingMap);
      for (const d of dettaglio) {
        if (!d.pesoGrammi) continue;
        const current = totali.get(d.id) ?? 0;
        totali.set(d.id, current + d.pesoGrammi * moltiplicatore);
      }
    }
  }

  // Build shopping list items
  const items: ShoppingListItem[] = [];
  for (const [id, totaleGrammi] of totali) {
    const ing = ingMap.get(id);
    if (!ing) continue;

    const totaleUnita =
      ing.peso_unita
        ? Math.round((totaleGrammi / ing.peso_unita) * 100) / 100
        : null;

    const costoTotale =
      ing.costo && totaleUnita !== null
        ? Math.round(ing.costo * totaleUnita * 100) / 100
        : null;

    items.push({
      ingredienteId: id,
      nome: ing.nome,
      totaleGrammi: Math.round(totaleGrammi * 100) / 100,
      nome_unita: ing.nome_unita,
      peso_unita: ing.peso_unita,
      totaleUnita,
      costo: ing.costo,
      costoTotale,
    });
  }

  // Sort alphabetically
  items.sort((a, b) => a.nome.localeCompare(b.nome, "it"));

  const html = generateShoppingListHtml(items);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lista-spesa.html"',
      "Access-Control-Allow-Origin": "*",
    },
  });
}
