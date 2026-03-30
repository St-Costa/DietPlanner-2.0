import type { SlugifyResponse } from "../types";
import path from "path";

const FOLDER_MAP = {
  ingrediente: "Ingredienti",
  ricetta: "Ricette",
  giornata: "Giornate",
  "lista-spesa": "ListeSpesa",
} as const;

export function slugify(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // keep alphanumeric, spaces, hyphens
    .trim()
    .replace(/[\s_]+/g, "-")       // spaces → hyphens
    .replace(/-{2,}/g, "-")        // collapse multiple hyphens
    .replace(/^-|-$/g, "");        // trim leading/trailing hyphens
}

export async function generateSlug(
  nome: string,
  tipo: keyof typeof FOLDER_MAP,
  dataDir: string
): Promise<SlugifyResponse> {
  const base = slugify(nome);
  const folder = path.join(dataDir, FOLDER_MAP[tipo]);

  let candidate = base;
  let counter = 2;

  while (true) {
    const filePath = path.join(folder, `${candidate}.md`);
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return { slug: candidate, available: true };
    }
    candidate = `${base}-${counter}`;
    counter++;
  }
}
