import { json } from "../router";
import { isValidNutritionValueUrl, scrapeNutritionValue } from "../services/scraperService";

export async function handleScrapeIngrediente(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { url } = body;
  if (!url || typeof url !== "string") {
    return json({ error: "Campo 'url' obbligatorio" }, 400);
  }

  if (!isValidNutritionValueUrl(url)) {
    return json(
      { error: "URL non supportato. Sono accettati solo URL di www.nutritionvalue.org con pattern *_nutritional_value.html" },
      400
    );
  }

  try {
    const result = await scrapeNutritionValue(url);
    return json(result);
  } catch (err) {
    console.error("[scraper] Fetch/parse error:", err);
    return json(
      { error: "Impossibile recuperare o analizzare la pagina", details: String(err) },
      502
    );
  }
}
