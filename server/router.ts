import { handleIngredienti } from "./handlers/ingredienti";
import { handleRicette } from "./handlers/ricette";
import { handleGiornate } from "./handlers/giornate";
import { handleListaSpesa } from "./handlers/listaSpesa";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function router(req: Request, dataDir: string): Response | Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Health check
  if (path === "/health") {
    return json({ ok: true, timestamp: new Date().toISOString() });
  }

  // Slugify helper
  if (path === "/api/slugify" && req.method === "GET") {
    return handleSlugify(url, dataDir);
  }

  // Route to handlers
  if (path.startsWith("/api/ingredienti")) {
    return handleIngredienti(req, url, dataDir);
  }
  if (path.startsWith("/api/ricette")) {
    return handleRicette(req, url, dataDir);
  }
  if (path.startsWith("/api/giornate")) {
    return handleGiornate(req, url, dataDir);
  }
  if (path === "/api/lista-spesa" && req.method === "POST") {
    return handleListaSpesa(req, dataDir);
  }

  // Serve static files from frontend/build in production
  if (process.env.NODE_ENV === "production") {
    return serveStatic(path);
  }

  return json({ error: "Not found" }, 404);
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
