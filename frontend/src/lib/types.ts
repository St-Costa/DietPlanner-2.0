// Mirror of server/types.ts for frontend use

export interface NutritionPer100g {
  kcal: number;
  proteine: number;
  fibre: number;
  grassi: number;
  saturi: number;
  carboidrati: number;
  zuccheri: number;
  sodio: number;
  colesterolo: number;
}

export interface NutritionTotals extends NutritionPer100g {
  grammi: number;
}

export interface Ingrediente extends NutritionPer100g {
  id: string;
  nome: string;
  tipo: string;
  nome_unita: string | null;
  peso_unita: number | null;
  costo: number | null;
  created_at: string;
  updated_at: string;
}

export type IngredienteInput = Omit<Ingrediente, "id" | "created_at" | "updated_at">;

export interface RicettaIngrediente {
  id: string;
  quantita: number;
  unita: string;
}

export interface RicettaIngredienteDettaglio extends RicettaIngrediente {
  nome: string;
  pesoGrammi: number;
  nutrition: NutritionTotals;
  nome_unita: string | null;
  peso_unita: number | null;
  costo: number | null;
}

export interface RicettaFull {
  id: string;
  nome: string;
  ingredienti: RicettaIngrediente[];
  preparazione: string;
  ingredientiDettaglio: RicettaIngredienteDettaglio[];
  nutrizione: NutritionTotals;
  created_at: string;
  updated_at: string;
}

export type RicettaInput = {
  nome: string;
  ingredienti: RicettaIngrediente[];
  preparazione: string;
};

export interface GiornataRicettaDettaglio {
  id: string;
  nome: string;
  nutrizione: NutritionTotals;
}

export interface GiornataFull {
  id: string;
  nome: string;
  ricette: string[];
  ricetteDettaglio: GiornataRicettaDettaglio[];
  totale: NutritionTotals;
  created_at: string;
  updated_at: string;
}

export type GiornataInput = {
  nome: string;
  ricette: string[];
};

export interface ShoppingListSelezione {
  giornataId: string;
  moltiplicatore: number;
}

export type WSType = "file_changed" | "file_created" | "file_deleted" | "connected";

export interface WSMessage {
  type: WSType;
  entity: "ingrediente" | "ricetta" | "giornata";
  id: string;
  timestamp: string;
}

export interface SlugifyResponse {
  slug: string;
  available: boolean;
}
