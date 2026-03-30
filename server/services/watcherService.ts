import type { ServerWebSocket } from "bun";
import type { WSMessage, WSEntity } from "../types";
import path from "path";

const clients = new Set<ServerWebSocket>();

export function subscribe(ws: ServerWebSocket): void {
  clients.add(ws);
}

export function unsubscribe(ws: ServerWebSocket): void {
  clients.delete(ws);
}

function broadcast(message: WSMessage): void {
  const payload = JSON.stringify(message);
  for (const ws of clients) {
    try {
      ws.send(payload);
    } catch {
      clients.delete(ws);
    }
  }
}

function pathToEntity(filePath: string): { entity: WSEntity; id: string } | null {
  const parts = filePath.replace(/\\/g, "/").split("/");
  const filename = parts[parts.length - 1];
  const folder = parts[parts.length - 2];

  if (!filename.endsWith(".md")) return null;
  const id = filename.slice(0, -3);

  if (folder === "Ingredienti") return { entity: "ingrediente", id };
  if (folder === "Ricette") return { entity: "ricetta", id };
  if (folder === "Giornate") return { entity: "giornata", id };
  if (folder === "ListeSpesa") return { entity: "lista-spesa", id };
  return null;
}

export async function initWatcher(dataDir: string): Promise<void> {
  const chokidar = await import("chokidar");

  const watchPath = path.resolve(dataDir);
  console.log(`[Watcher] Watching ${watchPath}`);

  const watcher = chokidar.default.watch(watchPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });

  watcher.on("add", (filePath) => {
    const info = pathToEntity(filePath);
    if (!info) return;
    console.log(`[Watcher] file_created: ${filePath}`);
    broadcast({ type: "file_created", ...info, timestamp: new Date().toISOString() });
  });

  watcher.on("change", (filePath) => {
    const info = pathToEntity(filePath);
    if (!info) return;
    console.log(`[Watcher] file_changed: ${filePath}`);
    broadcast({ type: "file_changed", ...info, timestamp: new Date().toISOString() });
  });

  watcher.on("unlink", (filePath) => {
    const info = pathToEntity(filePath);
    if (!info) return;
    console.log(`[Watcher] file_deleted: ${filePath}`);
    broadcast({ type: "file_deleted", ...info, timestamp: new Date().toISOString() });
  });
}
