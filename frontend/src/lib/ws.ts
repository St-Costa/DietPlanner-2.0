import { writable } from "svelte/store";
import type { WSMessage } from "./types";

export type WsStatus = "connecting" | "connected" | "disconnected";

export const wsStatus = writable<WsStatus>("disconnected");

type MessageHandler = (msg: WSMessage) => void;
const handlers: Set<MessageHandler> = new Set();

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let retryDelay = 1000;
const MAX_RETRY = 30000;

export function onMessage(handler: MessageHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

function connect(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const host = import.meta.env.DEV ? "localhost:3000" : location.host;
  const url = `${protocol}//${host}/ws`;

  wsStatus.set("connecting");
  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("[WS] connected");
    wsStatus.set("connected");
    retryDelay = 1000; // reset backoff on success
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data) as WSMessage;
      if (msg.type === "connected") return; // handshake, ignore
      handlers.forEach((h) => h(msg));
    } catch (err) {
      console.warn("[WS] bad message", err);
    }
  };

  ws.onclose = () => {
    console.log("[WS] disconnected, reconnecting in", retryDelay, "ms");
    wsStatus.set("disconnected");
    ws = null;
    scheduleReconnect();
  };

  ws.onerror = () => {
    ws?.close();
  };
}

function scheduleReconnect(): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    retryDelay = Math.min(retryDelay * 2, MAX_RETRY);
    connect();
  }, retryDelay);
}

// Auto-connect when this module is imported (only in browser)
if (typeof window !== "undefined") {
  connect();
}
