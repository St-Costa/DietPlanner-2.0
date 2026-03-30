import * as fs from "./fileService";
import { computeRicettaDettaglio } from "../parsers/nutritionCalc";
import type { ShoppingListSelezione, ShoppingListItem, RicettaExport, Ingrediente } from "../types";

export async function computeShoppingList(
  selezione: ShoppingListSelezione[],
  dataDir: string
): Promise<{ items: ShoppingListItem[]; ricette: RicettaExport[]; costoTotale: number | null }> {
  const allIng = await fs.listIngredienti(dataDir);
  const ingMap = new Map<string, Ingrediente>(allIng.map((i) => [i.id, i]));

  const totali = new Map<string, number>();
  const ricetteOrdered: string[] = [];
  const ricetteMap = new Map<string, RicettaExport>();

  for (const { giornataId, moltiplicatore } of selezione) {
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

      if (!ricetteMap.has(ricettaId)) {
        ricetteOrdered.push(ricettaId);
        ricetteMap.set(ricettaId, {
          nome: ricetta.nome,
          preparazione: ricetta.preparazione,
          ingredienti: dettaglio.map((d) => ({ nome: d.nome, quantita: d.quantita, unita: d.unita })),
        });
      }
    }
  }

  const items: ShoppingListItem[] = [];
  let hasCosti = false;
  let costoSum = 0;

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

    if (costoTotale !== null) {
      hasCosti = true;
      costoSum += costoTotale;
    }

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

  items.sort((a, b) => a.nome.localeCompare(b.nome, "it"));

  const ricette: RicettaExport[] = ricetteOrdered.map((id) => ricetteMap.get(id)!);

  return {
    items,
    ricette,
    costoTotale: hasCosti ? Math.round(costoSum * 100) / 100 : null,
  };
}
