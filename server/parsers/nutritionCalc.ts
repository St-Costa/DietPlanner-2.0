import type { Ingrediente, RicettaIngrediente, NutritionTotals, RicettaIngredienteDettaglio } from "../types";

const NUTRITION_KEYS = [
  "kcal", "proteine", "fibre", "grassi", "saturi",
  "carboidrati", "zuccheri", "sodio", "colesterolo",
] as const;

/** Scale nutrition values from per-100g to a given gram amount */
export function scaleNutrition(ingrediente: Ingrediente, grammi: number): NutritionTotals {
  const factor = grammi / 100;
  return {
    grammi,
    kcal: round(ingrediente.kcal * factor),
    proteine: round(ingrediente.proteine * factor),
    fibre: round(ingrediente.fibre * factor),
    grassi: round(ingrediente.grassi * factor),
    saturi: round(ingrediente.saturi * factor),
    carboidrati: round(ingrediente.carboidrati * factor),
    zuccheri: round(ingrediente.zuccheri * factor),
    sodio: round(ingrediente.sodio * factor),
    colesterolo: round(ingrediente.colesterolo * factor),
  };
}

/** Convert a RicettaIngrediente entry to grams */
export function toGrams(entry: RicettaIngrediente, ingrediente: Ingrediente): number {
  if (entry.unita === "g") {
    return entry.quantita;
  }
  // Unit-based: quantita is in units, peso_unita is g/unit
  const pesoUnita = ingrediente.peso_unita ?? 100;
  return entry.quantita * pesoUnita;
}

/** Compute detailed nutrition for all ingredients in a recipe */
export function computeRicettaDettaglio(
  ingredientiEntries: RicettaIngrediente[],
  ingredientiMap: Map<string, Ingrediente>
): { dettaglio: RicettaIngredienteDettaglio[]; totale: NutritionTotals } {
  const dettaglio: RicettaIngredienteDettaglio[] = [];
  const totale = zeroNutrition();

  for (const entry of ingredientiEntries) {
    const ing = ingredientiMap.get(entry.id);
    if (!ing) {
      // Orphaned reference: include with zero nutrition and a warning flag
      dettaglio.push({
        ...entry,
        nome: `[non trovato: ${entry.id}]`,
        pesoGrammi: 0,
        nutrition: zeroNutrition(),
        nome_unita: null,
        peso_unita: null,
        costo: null,
      });
      continue;
    }

    const pesoGrammi = toGrams(entry, ing);
    const nutrition = scaleNutrition(ing, pesoGrammi);

    dettaglio.push({
      ...entry,
      nome: ing.nome,
      pesoGrammi,
      nutrition,
      nome_unita: ing.nome_unita,
      peso_unita: ing.peso_unita,
      costo: ing.costo,
    });

    // Accumulate totals
    for (const key of NUTRITION_KEYS) {
      totale[key] = round(totale[key] + nutrition[key]);
    }
    totale.grammi = round(totale.grammi + pesoGrammi);
  }

  return { dettaglio, totale };
}

/** Sum NutritionTotals arrays */
export function sumNutrition(items: NutritionTotals[]): NutritionTotals {
  const totale = zeroNutrition();
  for (const item of items) {
    for (const key of NUTRITION_KEYS) {
      totale[key] = round(totale[key] + item[key]);
    }
    totale.grammi = round(totale.grammi + item.grammi);
  }
  return totale;
}

export function zeroNutrition(): NutritionTotals {
  return {
    grammi: 0, kcal: 0, proteine: 0, fibre: 0,
    grassi: 0, saturi: 0, carboidrati: 0,
    zuccheri: 0, sodio: 0, colesterolo: 0,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
