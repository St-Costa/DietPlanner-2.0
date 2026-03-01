import type { NutritionTotals, RicettaIngrediente, Ingrediente } from "../types";

export const NUTRITION_LABELS: Record<keyof NutritionTotals, string> = {
  grammi: "Peso (g)",
  kcal: "Kcal",
  proteine: "Proteine",
  fibre: "Fibre",
  grassi: "Grassi",
  saturi: "- Saturi",
  carboidrati: "Carboidrati",
  zuccheri: "- Zuccheri",
  sodio: "Sodio",
  colesterolo: "Colesterolo",
};

export const NUTRITION_KEYS: (keyof NutritionTotals)[] = [
  "kcal", "proteine", "fibre", "grassi", "saturi",
  "carboidrati", "zuccheri", "sodio", "colesterolo",
];

export const INGREDIENTE_KEYS: (keyof NutritionTotals)[] = NUTRITION_KEYS;

export function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

export function zeroNutrition(): NutritionTotals {
  return {
    grammi: 0, kcal: 0, proteine: 0, fibre: 0,
    grassi: 0, saturi: 0, carboidrati: 0,
    zuccheri: 0, sodio: 0, colesterolo: 0,
  };
}

export function toGrams(entry: RicettaIngrediente, ing: Ingrediente): number {
  if (entry.unita === "g") return entry.quantita;
  return entry.quantita * (ing.peso_unita ?? 100);
}

export function scaleNutrition(ing: Ingrediente, grammi: number): NutritionTotals {
  const f = grammi / 100;
  return {
    grammi,
    kcal: round(ing.kcal * f),
    proteine: round(ing.proteine * f),
    fibre: round(ing.fibre * f),
    grassi: round(ing.grassi * f),
    saturi: round(ing.saturi * f),
    carboidrati: round(ing.carboidrati * f),
    zuccheri: round(ing.zuccheri * f),
    sodio: round(ing.sodio * f),
    colesterolo: round(ing.colesterolo * f),
  };
}

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

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
