import { handleIngredienti } from "./handlers/ingredienti";
import { handleRicette } from "./handlers/ricette";
import { handleGiornate } from "./handlers/giornate";
import { handleListaSpesa } from "./handlers/listaSpesa";
import { handleScrapeIngrediente } from "./handlers/scraper";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function router(req: Request, dataDir: string): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // Health check
    if (path === "/health") {
      return json({ ok: true, timestamp: new Date().toISOString() });
    }

    // Slugify helper
    if (path === "/api/slugify" && req.method === "GET") {
      return await handleSlugify(url, dataDir);
    }

    // Route to handlers
    if (path.startsWith("/api/ingredienti")) {
      return await handleIngredienti(req, url, dataDir);
    }
    if (path.startsWith("/api/ricette")) {
      return await handleRicette(req, url, dataDir);
    }
    if (path.startsWith("/api/giornate")) {
      return await handleGiornate(req, url, dataDir);
    }
    if (path === "/api/lista-spesa" && req.method === "POST") {
      return await handleListaSpesa(req, dataDir);
    }
    if (path === "/api/scrape-ingrediente") {
      return await handleScrapeIngrediente(req);
    }

    // Serve static files from frontend/build in production
    if (process.env.NODE_ENV === "production") {
      return await serveStatic(path);
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error(`[router] Unhandled error on ${req.method} ${path}:`, err);
    return json({ error: "Internal server error", details: String(err) }, 500);
  }
}

async function handleSlugify(url: URL, dataDir: string): Promise<Response> {
  const { generateSlug } = await import("./services/slugService");
  const nome = url.searchParams.get("nome") ?? "";
  const tipo = url.searchParams.get("tipo") as "ingrediente" | "ricetta" | "giornata" | null;
  if (!nome || !tipo) {
    return json({ error: "Missing nome or tipo param" }, 400);
  }
  const result = await generateSlug(nome, tipo, dataDir);
  return json(result);
}

async function serveStatic(path: string): Promise<Response> {
  const buildDir = "./frontend/build";
  // Try exact path first, then fallback to index.html for SPA routing
  const candidates = [
    `${buildDir}${path}`,
    `${buildDir}${path}/index.html`,
    `${buildDir}/index.html`,
  ];
  for (const filePath of candidates) {
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }
  }
  return new Response("Not found", { status: 404 });
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
