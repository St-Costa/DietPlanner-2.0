import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { json } from "../router";

export async function handleFabbisogno(req: Request, dataDir: string): Promise<Response> {
  const settingsDir = join(dataDir, "settings");
  const filePath = join(settingsDir, "fabbisogno.json");

  if (req.method === "GET") {
    try {
      const file = Bun.file(filePath);
      if (!(await file.exists())) return json({});
      return json(await file.json());
    } catch {
      return json({});
    }
  }

  if (req.method === "PUT") {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    if (!existsSync(settingsDir)) {
      mkdirSync(settingsDir, { recursive: true });
    }
    await Bun.write(filePath, JSON.stringify(body, null, 2));
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
}
