// ─── Nutrition ───────────────────────────────────────────────────────────────

export interface NutritionPer100g {
  kcal: number;
  proteine: number;
  fibre: number;
  grassi: number;
  saturi: number;
  carboidrati: number;
  zuccheri: number;
  sodio: number;      // mg
  colesterolo: number; // mg
}

export interface NutritionTotals extends NutritionPer100g {
  grammi: number; // total weight in grams this nutrition refers to
}

// ─── Ingrediente ─────────────────────────────────────────────────────────────

export interface Ingrediente extends NutritionPer100g {
  id: string;
  nome: string;
  tipo: string;
  // optional product details
  nome_unita: string | null;
  peso_unita: number | null; // grams per unit
  costo: number | null;      // euros per unit
  // extra nutritional values (vitamins, minerals, etc.) from import
  extra_nutrienti?: Record<string, { valore: number; unita: string }>;
  created_at: string;
  updated_at: string;
}

export type IngredienteInput = Omit<Ingrediente, "id" | "created_at" | "updated_at">;

// ─── Ricetta ─────────────────────────────────────────────────────────────────

export interface RicettaIngrediente {
  id: string;       // stable ingredient id
  quantita: number; // numeric amount
  unita: string;    // "g" or nome_unita of the ingredient
}

export interface Ricetta {
  id: string;
  nome: string;
  ingredienti: RicettaIngrediente[];
  created_at: string;
  updated_at: string;
  // markdown body (preparazione) is separate from frontmatter
}

export interface RicettaIngredienteDettaglio extends RicettaIngrediente {
  nome: string;
  pesoGrammi: number; // always in grams regardless of unit
  nutrition: NutritionTotals;
  // ingredient unit info for display
  nome_unita: string | null;
  peso_unita: number | null;
  costo: number | null;
}

export interface RicettaFull extends Ricetta {
  preparazione: string; // markdown body
  ingredientiDettaglio: RicettaIngredienteDettaglio[];
  nutrizione: NutritionTotals;
}

export type RicettaInput = {
  nome: string;
  ingredienti: RicettaIngrediente[];
  preparazione: string;
};

// ─── Giornata ────────────────────────────────────────────────────────────────

export interface Giornata {
  id: string;
  nome: string;
  ricette: string[];   // list of ricetta ids (1 portion each)
  created_at: string;
  updated_at: string;
}

export interface GiornataRicettaDettaglio {
  id: string;
  nome: string;
  nutrizione: NutritionTotals;
}

export interface GiornataFull extends Giornata {
  ricetteDettaglio: GiornataRicettaDettaglio[];
  totale: NutritionTotals;
}

export type GiornataInput = {
  nome: string;
  ricette: string[];
};

// ─── Shopping List ────────────────────────────────────────────────────────────

export interface ShoppingListSelezione {
  giornataId: string;
  moltiplicatore: number;
}

export interface ShoppingListInput {
  selezione: ShoppingListSelezione[];
}

export interface ShoppingListItem {
  ingredienteId: string;
  nome: string;
  totaleGrammi: number;
  // display info
  nome_unita: string | null;
  peso_unita: number | null;
  totaleUnita: number | null; // totaleGrammi / peso_unita, if applicable
  costo: number | null;
  costoTotale: number | null;
}

// ─── WebSocket ────────────────────────────────────────────────────────────────

export type WSEntity = "ingrediente" | "ricetta" | "giornata";
export type WSType = "file_changed" | "file_created" | "file_deleted" | "connected";

export interface WSMessage {
  type: WSType;
  entity: WSEntity;
  id: string;
  timestamp: string;
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

export type EntityType = "ingrediente" | "ricetta" | "giornata";

export interface SlugifyResponse {
  slug: string;
  available: boolean;
}

export interface DeleteConflict {
  error: string;
  usedIn: string[];
}
