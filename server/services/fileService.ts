import path from "path";
import { parseFile, writeFile } from "../parsers/frontmatter";
import { generateSlug } from "./slugService";
import type {
  Ingrediente, IngredienteInput,
  Ricetta, RicettaInput,
  Giornata, GiornataInput,
  EntityType,
} from "../types";

const FOLDER_MAP: Record<EntityType, string> = {
  ingrediente: "Ingredienti",
  ricetta: "Ricette",
  giornata: "Giornate",
};

function folderPath(dataDir: string, tipo: EntityType): string {
  return path.join(dataDir, FOLDER_MAP[tipo]);
}

function filePath(dataDir: string, tipo: EntityType, id: string): string {
  return path.join(folderPath(dataDir, tipo), `${id}.md`);
}

// ─── Generic list/get ────────────────────────────────────────────────────────

export async function listFiles<T>(dataDir: string, tipo: EntityType): Promise<T[]> {
  const folder = folderPath(dataDir, tipo);
  const glob = new Bun.Glob("*.md");
  const results: T[] = [];

  for await (const file of glob.scan({ cwd: folder, absolute: false })) {
    try {
      const { data } = await parseFile<T>(path.join(folder, file));
      results.push(data);
    } catch (err) {
      console.warn(`[fileService] Failed to parse ${file}:`, err);
    }
  }

  return results;
}

export async function getFile<T>(
  dataDir: string,
  tipo: EntityType,
  id: string
): Promise<{ data: T; content: string } | null> {
  const fp = filePath(dataDir, tipo, id);
  const file = Bun.file(fp);
  if (!(await file.exists())) return null;
  return parseFile<T>(fp);
}

export async function fileExists(dataDir: string, tipo: EntityType, id: string): Promise<boolean> {
  return Bun.file(filePath(dataDir, tipo, id)).exists();
}

// ─── Ingredienti ─────────────────────────────────────────────────────────────

export async function listIngredienti(dataDir: string): Promise<Ingrediente[]> {
  return listFiles<Ingrediente>(dataDir, "ingrediente");
}

export async function getIngrediente(dataDir: string, id: string): Promise<Ingrediente | null> {
  const result = await getFile<Ingrediente>(dataDir, "ingrediente", id);
  return result?.data ?? null;
}

export async function createIngrediente(dataDir: string, input: IngredienteInput): Promise<Ingrediente> {
  const { slug } = await generateSlug(input.nome, "ingrediente", dataDir);
  const now = new Date().toISOString();
  const ingrediente: Ingrediente = {
    id: slug,
    ...input,
    created_at: now,
    updated_at: now,
  };
  const fp = filePath(dataDir, "ingrediente", slug);
  await writeFile(fp, ingrediente as unknown as Record<string, unknown>, "");
  return ingrediente;
}

export async function updateIngrediente(
  dataDir: string,
  id: string,
  input: IngredienteInput
): Promise<Ingrediente | null> {
  const existing = await getIngrediente(dataDir, id);
  if (!existing) return null;

  const updated: Ingrediente = {
    ...existing,
    ...input,
    id,
    updated_at: new Date().toISOString(),
  };
  const fp = filePath(dataDir, "ingrediente", id);
  await writeFile(fp, updated as unknown as Record<string, unknown>, "");
  return updated;
}

export async function deleteIngrediente(dataDir: string, id: string): Promise<boolean> {
  const fp = filePath(dataDir, "ingrediente", id);
  const file = Bun.file(fp);
  if (!(await file.exists())) return false;
  await import("node:fs/promises").then((fs) => fs.unlink(fp));
  return true;
}

// ─── Ricette ─────────────────────────────────────────────────────────────────

export async function listRicette(dataDir: string): Promise<Array<Ricetta & { preparazione: string }>> {
  const folder = folderPath(dataDir, "ricetta");
  const glob = new Bun.Glob("*.md");
  const results: Array<Ricetta & { preparazione: string }> = [];

  for await (const file of glob.scan({ cwd: folder, absolute: false })) {
    try {
      const { data, content } = await parseFile<Ricetta>(path.join(folder, file));
      results.push({ ...data, preparazione: content });
    } catch (err) {
      console.warn(`[fileService] Failed to parse ${file}:`, err);
    }
  }
  return results;
}

export async function getRicetta(
  dataDir: string,
  id: string
): Promise<(Ricetta & { preparazione: string }) | null> {
  const result = await getFile<Ricetta>(dataDir, "ricetta", id);
  if (!result) return null;
  return { ...result.data, preparazione: result.content };
}

export async function createRicetta(
  dataDir: string,
  input: RicettaInput
): Promise<Ricetta & { preparazione: string }> {
  const { slug } = await generateSlug(input.nome, "ricetta", dataDir);
  const now = new Date().toISOString();
  const ricetta: Ricetta = {
    id: slug,
    nome: input.nome,
    ingredienti: input.ingredienti,
    created_at: now,
    updated_at: now,
  };
  const fp = filePath(dataDir, "ricetta", slug);
  await writeFile(fp, ricetta as unknown as Record<string, unknown>, input.preparazione);
  return { ...ricetta, preparazione: input.preparazione };
}

export async function updateRicetta(
  dataDir: string,
  id: string,
  input: RicettaInput
): Promise<(Ricetta & { preparazione: string }) | null> {
  const existing = await getRicetta(dataDir, id);
  if (!existing) return null;

  const updated: Ricetta = {
    id,
    nome: input.nome,
    ingredienti: input.ingredienti,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
  };
  const fp = filePath(dataDir, "ricetta", id);
  await writeFile(fp, updated as unknown as Record<string, unknown>, input.preparazione);
  return { ...updated, preparazione: input.preparazione };
}

export async function deleteRicetta(dataDir: string, id: string): Promise<boolean> {
  const fp = filePath(dataDir, "ricetta", id);
  const file = Bun.file(fp);
  if (!(await file.exists())) return false;
  await import("node:fs/promises").then((fs) => fs.unlink(fp));
  return true;
}

// ─── Giornate ────────────────────────────────────────────────────────────────

export async function listGiornate(dataDir: string): Promise<Giornata[]> {
  return listFiles<Giornata>(dataDir, "giornata");
}

export async function getGiornata(dataDir: string, id: string): Promise<Giornata | null> {
  const result = await getFile<Giornata>(dataDir, "giornata", id);
  return result?.data ?? null;
}

export async function createGiornata(dataDir: string, input: GiornataInput): Promise<Giornata> {
  const { slug } = await generateSlug(input.nome, "giornata", dataDir);
  const now = new Date().toISOString();
  const giornata: Giornata = {
    id: slug,
    ...input,
    created_at: now,
    updated_at: now,
  };
  const fp = filePath(dataDir, "giornata", slug);
  await writeFile(fp, giornata as unknown as Record<string, unknown>, "");
  return giornata;
}

export async function updateGiornata(
  dataDir: string,
  id: string,
  input: GiornataInput
): Promise<Giornata | null> {
  const existing = await getGiornata(dataDir, id);
  if (!existing) return null;

  const updated: Giornata = {
    ...existing,
    ...input,
    id,
    updated_at: new Date().toISOString(),
  };
  const fp = filePath(dataDir, "giornata", id);
  await writeFile(fp, updated as unknown as Record<string, unknown>, "");
  return updated;
}

export async function deleteGiornata(dataDir: string, id: string): Promise<boolean> {
  const fp = filePath(dataDir, "giornata", id);
  const file = Bun.file(fp);
  if (!(await file.exists())) return false;
  await import("node:fs/promises").then((fs) => fs.unlink(fp));
  return true;
}

// ─── Cross-entity reference checks ───────────────────────────────────────────

/** Returns ricette ids that reference this ingrediente id */
export async function ricetteUsingIngrediente(dataDir: string, ingredienteId: string): Promise<string[]> {
  const ricette = await listRicette(dataDir);
  return ricette
    .filter((r) => r.ingredienti.some((i) => i.id === ingredienteId))
    .map((r) => r.id);
}

/** Returns giornate ids that reference this ricetta id */
export async function giornateUsingRicetta(dataDir: string, ricettaId: string): Promise<string[]> {
  const giornate = await listGiornate(dataDir);
  return giornate
    .filter((g) => g.ricette.includes(ricettaId))
    .map((g) => g.id);
}

// ─── Cascade helpers ──────────────────────────────────────────────────────────

/** Removes ingredienteId from all ricette that reference it (modifies files in place) */
export async function removeIngredienteFromRicette(dataDir: string, ingredienteId: string): Promise<void> {
  const ricette = await listRicette(dataDir);
  const fsPromises = await import("node:fs/promises");
  for (const r of ricette) {
    if (!r.ingredienti.some((i) => i.id === ingredienteId)) continue;
    const updated = {
      ...r,
      ingredienti: r.ingredienti.filter((i) => i.id !== ingredienteId),
      updated_at: new Date().toISOString(),
    };
    const fp = filePath(dataDir, "ricetta", r.id);
    await writeFile(fp, updated as unknown as Record<string, unknown>, r.preparazione);
  }
}

/** Removes ricettaId from all giornate that reference it (modifies files in place) */
export async function removeRicettaFromGiornate(dataDir: string, ricettaId: string): Promise<void> {
  const giornate = await listGiornate(dataDir);
  for (const g of giornate) {
    if (!g.ricette.includes(ricettaId)) continue;
    const updated: Giornata = {
      ...g,
      ricette: g.ricette.filter((id) => id !== ricettaId),
      updated_at: new Date().toISOString(),
    };
    const fp = filePath(dataDir, "giornata", g.id);
    await writeFile(fp, updated as unknown as Record<string, unknown>, "");
  }
}
