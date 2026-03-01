import { parse } from "node-html-parser";

// Only allow URLs from this specific site with the nutritional_value pattern
const ALLOWED_URL_PATTERN =
  /^https?:\/\/www\.nutritionvalue\.org\/[^?#/]+_nutritional_value\.html(\?[^#]*)?$/;

// Maps data-tooltip attribute values from the site to our core schema fields
const CORE_FIELD_MAP: Record<string, string> = {
  Protein: "proteine",
  Fat: "grassi",
  "Saturated fatty acids": "saturi",
  Carbohydrate: "carboidrati",
  Fiber: "fibre",
  Sugars: "zuccheri",
  Sodium: "sodio",
  Cholesterol: "colesterolo",
};

export type ScrapeResult = {
  nome: string;
  kcal: number;
  proteine: number;
  grassi: number;
  saturi: number;
  carboidrati: number;
  fibre: number;
  zuccheri: number;
  sodio: number;
  colesterolo: number;
  extra_nutrienti: Record<string, { valore: number; unita: string }>;
};

export function isValidNutritionValueUrl(url: string): boolean {
  return ALLOWED_URL_PATTERN.test(url);
}

export async function scrapeNutritionValue(url: string): Promise<ScrapeResult> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const root = parse(html);

  // 1. Food name from <h1>
  const h1 = root.querySelector("h1");
  const nome = h1?.text.trim() ?? "";
  if (!nome) throw new Error("Nome alimento non trovato nella pagina");

  // 2. Calories from the element with id="calories"
  const caloriesEl = root.querySelector("#calories");
  const kcal = parseFloat(caloriesEl?.text.trim() ?? "0") || 0;

  // 3. Parse all detailed nutrient tables (class="... nutrient results")
  const coreFields: Record<string, number> = {};
  const extra_nutrienti: Record<string, { valore: number; unita: string }> = {};

  const tables = root.querySelectorAll("table.nutrient.results");

  for (const table of tables) {
    for (const row of table.querySelectorAll("tr")) {
      const nameTd = row.querySelector("td.left");
      const valueTd = row.querySelector("td.right");
      if (!nameTd || !valueTd) continue;

      // Determine nutrient name:
      // - Single <a data-tooltip>: use the tooltip value (clean canonical name)
      // - Multiple links (e.g. "Lutein + zeaxanthin"): use full text content
      // - No links (plain text sub-entries): use text content
      const links = nameTd.querySelectorAll("a[data-tooltip]");
      let name: string;
      if (links.length === 1) {
        name = links[0].getAttribute("data-tooltip")?.trim() ?? "";
      } else {
        // Remove [alias] spans, then clean whitespace
        name = nameTd.text.replace(/\[.*?\]/g, "").replace(/\u00a0/g, " ").trim();
      }
      if (!name) continue;

      // Parse "VALUE\u00a0UNIT" or "VALUE UNIT" from the right column
      const rawValue = valueTd.text.replace(/\u00a0/g, " ").trim();
      const match = rawValue.match(/^([\d.]+)\s*([a-zA-Z\u03bc%]+)$/);
      if (!match) continue;

      const valore = parseFloat(match[1]);
      const unita = match[2].toLowerCase();
      if (isNaN(valore)) continue;

      const coreKey = CORE_FIELD_MAP[name];
      if (coreKey) {
        // Only store first occurrence to avoid duplicates
        if (!(coreKey in coreFields)) {
          coreFields[coreKey] = valore;
        }
      } else {
        // Normalize key: lowercase, non-alphanumeric → underscore, trim underscores
        const key = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
        if (key && !(key in extra_nutrienti)) {
          extra_nutrienti[key] = { valore, unita };
        }
      }
    }
  }

  return {
    nome,
    kcal,
    proteine: coreFields["proteine"] ?? 0,
    grassi: coreFields["grassi"] ?? 0,
    saturi: coreFields["saturi"] ?? 0,
    carboidrati: coreFields["carboidrati"] ?? 0,
    fibre: coreFields["fibre"] ?? 0,
    zuccheri: coreFields["zuccheri"] ?? 0,
    sodio: coreFields["sodio"] ?? 0,
    colesterolo: coreFields["colesterolo"] ?? 0,
    extra_nutrienti,
  };
}
