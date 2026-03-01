import { router } from "./router";
import { subscribe, unsubscribe, initWatcher } from "./services/watcherService";

const PORT = parseInt(process.env.PORT ?? "3000");
const DATA_DIR = process.env.DATA_DIR ?? "./data";

console.log(`Starting DietPlanner server on port ${PORT}`);
console.log(`Data directory: ${DATA_DIR}`);

Bun.serve({
  port: PORT,
  fetch(req, server) {
    // WebSocket upgrade
    if (req.headers.get("upgrade") === "websocket") {
      const upgraded = server.upgrade(req);
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    return router(req, DATA_DIR);
  },
  websocket: {
    open(ws) {
      console.log("[WS] client connected");
      subscribe(ws);
      ws.send(JSON.stringify({
        type: "connected",
        entity: "",
        id: "",
        timestamp: new Date().toISOString(),
      }));
    },
    close(ws) {
      console.log("[WS] client disconnected");
      unsubscribe(ws);
    },
    message(_ws, _msg) {
      // clients don't send messages; ignore
    },
    drain(_ws) {
      // backpressure; ignore for this scale
    },
  },
});

// Initialize file watcher after server starts
initWatcher(DATA_DIR);

console.log(`Server running at http://localhost:${PORT}`);
