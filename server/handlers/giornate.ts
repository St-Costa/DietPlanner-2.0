import { json } from "../router";
import * as fs from "../services/fileService";
import {
  sumNutrition, zeroNutrition, computeRicettaDettaglio,
  computeExtraAgg, scaleNutrition, toGrams,
} from "../parsers/nutritionCalc";
import type {
  GiornataInput, GiornataFull, GiornataRicettaDettaglio, Ingrediente, NutritionTotals,
} from "../types";

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
    const extra = computeExtraAgg(ricetta.ingredienti, ingMap);
    ricetteDettaglio.push({
      id: ricettaId,
      nome: ricetta.nome,
      nutrizione: totale,
      extra_nutrienti: Object.keys(extra).length > 0 ? extra : undefined,
    });
  }

  const totale = sumNutrition(ricetteDettaglio.map((r) => r.nutrizione));

  return { ...giornata, ricetteDettaglio, totale };
}

export async function handleGiornate(req: Request, url: URL, dataDir: string): Promise<Response> {
  const segments = url.pathname.split("/").filter(Boolean);
  const id = segments[2];
  const sub = segments[3]; // e.g. "export-md"

  // GET /api/giornate/:id/export-md
  if (req.method === "GET" && id && sub === "export-md") {
    try {
      const md = await generateGiornataMd(id, dataDir);
      return new Response(md, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${id}.md"`,
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (e) {
      if (String(e).includes("Not found")) return json({ error: "Not found" }, 404);
      throw e;
    }
  }

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

// ─── Markdown export ──────────────────────────────────────────────────────────

const VITAMINE_KEYS = new Set([
  "vitamin_a_rae", "vitamin_c", "vitamin_d", "vitamin_e_alpha_tocopherol",
  "thiamin", "riboflavin", "niacin", "vitamin_b6", "folate_dfe",
  "vitamin_b12", "vitamin_k", "choline",
]);

const MINERALI_KEYS = new Set([
  "calcium", "iron", "magnesium", "phosphorus", "potassium",
  "selenium", "zinc", "copper",
]);

const EXTRA_LABELS: Record<string, string> = {
  vitamin_a_rae: "Vitamina A (RAE)", vitamin_c: "Vitamina C",
  vitamin_d: "Vitamina D", vitamin_e_alpha_tocopherol: "Vitamina E",
  thiamin: "Tiamina (B1)", riboflavin: "Riboflavina (B2)",
  niacin: "Niacina (B3)", vitamin_b6: "Vitamina B6",
  folate_dfe: "Folato (B9)", vitamin_b12: "Vitamina B12",
  vitamin_k: "Vitamina K", choline: "Colina",
  calcium: "Calcio", iron: "Ferro", magnesium: "Magnesio",
  phosphorus: "Fosforo", potassium: "Potassio", selenium: "Selenio",
  zinc: "Zinco", copper: "Rame",
};

function fmtN(v: number, dec = 1): string { return v.toFixed(dec); }
function fmtE(v: number): string {
  if (v < 0.1) return v.toFixed(3);
  if (v < 10) return v.toFixed(2);
  return v.toFixed(1);
}
function labelExtra(key: string): string {
  return EXTRA_LABELS[key] ?? key.replace(/_/g, " ");
}

function microTables(
  extra: Record<string, { valore: number; unita: string }>,
  lines: string[]
): void {
  const vit = Object.entries(extra).filter(([k]) => VITAMINE_KEYS.has(k));
  const min = Object.entries(extra).filter(([k]) => MINERALI_KEYS.has(k));
  const alt = Object.entries(extra).filter(([k]) => !VITAMINE_KEYS.has(k) && !MINERALI_KEYS.has(k));

  if (vit.length > 0) {
    lines.push("**Vitamine**\n");
    lines.push("| Vitamina | Valore |");
    lines.push("|---|---:|");
    for (const [k, { valore, unita }] of vit)
      lines.push(`| ${labelExtra(k)} | ${fmtE(valore)} ${unita} |`);
    lines.push("");
  }
  if (min.length > 0) {
    lines.push("**Minerali**\n");
    lines.push("| Minerale | Valore |");
    lines.push("|---|---:|");
    for (const [k, { valore, unita }] of min)
      lines.push(`| ${labelExtra(k)} | ${fmtE(valore)} ${unita} |`);
    lines.push("");
  }
  if (alt.length > 0) {
    lines.push("**Altri nutrienti**\n");
    lines.push("| Nutriente | Valore |");
    lines.push("|---|---:|");
    for (const [k, { valore, unita }] of alt)
      lines.push(`| ${labelExtra(k)} | ${fmtE(valore)} ${unita} |`);
    lines.push("");
  }
}

async function generateGiornataMd(id: string, dataDir: string): Promise<string> {
  const giornata = await fs.getGiornata(dataDir, id);
  if (!giornata) throw new Error("Not found");

  const allIng = await fs.listIngredienti(dataDir);
  const ingMap = new Map<string, Ingrediente>(allIng.map((i) => [i.id, i]));

  const date = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  const lines: string[] = [];

  lines.push(`# Giornata: ${giornata.nome}`);
  lines.push(`_Generata il ${date}_\n`);
  lines.push("---\n");

  // Accumulators for global totals
  const globalMacro: NutritionTotals = zeroNutrition();
  const globalExtra: Record<string, { valore: number; unita: string }> = {};

  for (let ri = 0; ri < giornata.ricette.length; ri++) {
    const ricettaId = giornata.ricette[ri];
    const ricetta = await fs.getRicetta(dataDir, ricettaId);

    if (!ricetta) {
      lines.push(`## ${ri + 1}. [Ricetta non trovata: ${ricettaId}]\n`);
      lines.push("---\n");
      continue;
    }

    lines.push(`## ${ri + 1}. ${ricetta.nome}\n`);

    // Per-ingredient data
    type IngRow = {
      nome: string;
      grammi: number;
      macro: NutritionTotals;
      extra: Record<string, { valore: number; unita: string }>;
    };
    const ingRows: IngRow[] = [];
    const ricettaMacro: NutritionTotals = zeroNutrition();
    const ricettaExtra: Record<string, { valore: number; unita: string }> = {};

    for (const entry of ricetta.ingredienti) {
      const ing = ingMap.get(entry.id);
      if (!ing) {
        ingRows.push({ nome: `[non trovato: ${entry.id}]`, grammi: 0, macro: zeroNutrition(), extra: {} });
        continue;
      }
      const grammi = toGrams(entry, ing);
      const macro = scaleNutrition(ing, grammi);

      // accumulate recipe macro
      for (const key of ["kcal", "proteine", "grassi", "saturi", "carboidrati", "zuccheri", "fibre", "sodio", "colesterolo"] as const) {
        ricettaMacro[key] = Math.round((ricettaMacro[key] + macro[key]) * 100) / 100;
      }
      ricettaMacro.grammi = Math.round((ricettaMacro.grammi + grammi) * 100) / 100;

      // ingredient extra
      const ingExtra: Record<string, { valore: number; unita: string }> = {};
      for (const [key, { valore, unita }] of Object.entries(ing.extra_nutrienti ?? {})) {
        const scaled = Math.round(valore * grammi / 100 * 1000) / 1000;
        ingExtra[key] = { valore: scaled, unita };
        ricettaExtra[key] = { valore: Math.round(((ricettaExtra[key]?.valore ?? 0) + scaled) * 1000) / 1000, unita };
        globalExtra[key] = { valore: Math.round(((globalExtra[key]?.valore ?? 0) + scaled) * 1000) / 1000, unita };
      }

      ingRows.push({ nome: ing.nome, grammi, macro, extra: ingExtra });
    }

    // accumulate global macro
    for (const key of ["kcal", "proteine", "grassi", "saturi", "carboidrati", "zuccheri", "fibre", "sodio", "colesterolo"] as const) {
      globalMacro[key] = Math.round((globalMacro[key] + ricettaMacro[key]) * 100) / 100;
    }
    globalMacro.grammi = Math.round((globalMacro.grammi + ricettaMacro.grammi) * 100) / 100;

    // Macro table
    lines.push("### Macronutrienti\n");
    lines.push("| Ingrediente | g | Kcal | Prot (g) | Grassi (g) | Saturi (g) | Carbo (g) | Zucc (g) | Fibre (g) | Sodio (mg) | Chol (mg) |");
    lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
    for (const r of ingRows) {
      const m = r.macro;
      lines.push(`| ${r.nome} | ${fmtN(r.grammi, 0)} | ${fmtN(m.kcal, 0)} | ${fmtN(m.proteine)} | ${fmtN(m.grassi)} | ${fmtN(m.saturi)} | ${fmtN(m.carboidrati)} | ${fmtN(m.zuccheri)} | ${fmtN(m.fibre)} | ${fmtN(m.sodio, 0)} | ${fmtN(m.colesterolo, 0)} |`);
    }
    const t = ricettaMacro;
    lines.push(`| **Totale** | **${fmtN(t.grammi, 0)}** | **${fmtN(t.kcal, 0)}** | **${fmtN(t.proteine)}** | **${fmtN(t.grassi)}** | **${fmtN(t.saturi)}** | **${fmtN(t.carboidrati)}** | **${fmtN(t.zuccheri)}** | **${fmtN(t.fibre)}** | **${fmtN(t.sodio, 0)}** | **${fmtN(t.colesterolo, 0)}** |`);
    lines.push("");

    // Per-ingredient micronutrients
    const hasExtra = ingRows.some((r) => Object.keys(r.extra).length > 0);
    if (hasExtra) {
      lines.push("### Micronutrienti per ingrediente\n");
      for (const r of ingRows) {
        if (Object.keys(r.extra).length === 0) continue;
        lines.push(`#### ${r.nome} (${fmtN(r.grammi, 0)} g)\n`);
        lines.push("| Nutriente | Valore |");
        lines.push("|---|---:|");
        for (const [k, { valore, unita }] of Object.entries(r.extra))
          lines.push(`| ${labelExtra(k)} | ${fmtE(valore)} ${unita} |`);
        lines.push("");
      }

      if (Object.keys(ricettaExtra).length > 0) {
        lines.push(`### Totale micronutrienti — ${ricetta.nome}\n`);
        microTables(ricettaExtra, lines);
      }
    }

    lines.push("---\n");
  }

  // Global totals
  lines.push("## Totale Giornata\n");
  lines.push("### Macronutrienti\n");
  lines.push("| Kcal | Prot (g) | Grassi (g) | Saturi (g) | Carbo (g) | Zucc (g) | Fibre (g) | Sodio (mg) | Chol (mg) |");
  lines.push("|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
  const g = globalMacro;
  lines.push(`| **${fmtN(g.kcal, 0)}** | **${fmtN(g.proteine)}** | **${fmtN(g.grassi)}** | **${fmtN(g.saturi)}** | **${fmtN(g.carboidrati)}** | **${fmtN(g.zuccheri)}** | **${fmtN(g.fibre)}** | **${fmtN(g.sodio, 0)}** | **${fmtN(g.colesterolo, 0)}** |`);
  lines.push("");

  if (Object.keys(globalExtra).length > 0) {
    lines.push("### Micronutrienti totali\n");
    microTables(globalExtra, lines);
  }

  return lines.join("\n");
}
