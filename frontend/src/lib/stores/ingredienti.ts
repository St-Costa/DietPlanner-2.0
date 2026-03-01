import { writable } from "svelte/store";
import { api } from "../api";
import { onMessage } from "../ws";
import type { Ingrediente } from "../types";

function createIngredientiStore() {
  const { subscribe, update, set } = writable<Ingrediente[]>([]);
  let loaded = false;

  // Handle WS messages
  onMessage(async (msg) => {
    if (msg.entity !== "ingrediente") return;

    if (msg.type === "file_deleted") {
      update((list) => list.filter((i) => i.id !== msg.id));
    } else if (msg.type === "file_changed" || msg.type === "file_created") {
      try {
        const updated = await api.ingredienti.get(msg.id);
        update((list) => {
          const idx = list.findIndex((i) => i.id === msg.id);
          if (idx >= 0) {
            const copy = [...list];
            copy[idx] = updated;
            return copy;
          }
          return [...list, updated];
        });
      } catch (err) {
        console.warn("[store/ingredienti] WS update failed:", err);
      }
    }
  });

  return {
    subscribe,
    load: async () => {
      if (loaded) return;
      const data = await api.ingredienti.list();
      set(data);
      loaded = true;
    },
    reload: async () => {
      const data = await api.ingredienti.list();
      set(data);
      loaded = true;
    },
    invalidate: () => { loaded = false; },
  };
}

export const ingredientiStore = createIngredientiStore();
