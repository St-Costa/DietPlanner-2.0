import { writable } from "svelte/store";
import { api } from "../api";
import { onMessage } from "../ws";
import type { GiornataFull } from "../types";

function createGiornateStore() {
  const { subscribe, update, set } = writable<GiornataFull[]>([]);
  let loaded = false;

  onMessage(async (msg) => {
    if (msg.entity !== "giornata") return;

    if (msg.type === "file_deleted") {
      update((list) => list.filter((g) => g.id !== msg.id));
    } else if (msg.type === "file_changed" || msg.type === "file_created") {
      try {
        const updated = await api.giornate.get(msg.id);
        update((list) => {
          const idx = list.findIndex((g) => g.id === msg.id);
          if (idx >= 0) {
            const copy = [...list];
            copy[idx] = updated;
            return copy;
          }
          return [...list, updated];
        });
      } catch (err) {
        console.warn("[store/giornate] WS update failed:", err);
      }
    }
  });

  // Ingredient or recipe changes invalidate giornate totals
  onMessage(async (msg) => {
    if (
      (msg.entity === "ingrediente" || msg.entity === "ricetta") &&
      (msg.type === "file_changed" || msg.type === "file_deleted")
    ) {
      try {
        const data = await api.giornate.list();
        set(data);
      } catch (err) {
        console.warn("[store/giornate] upstream change reload failed:", err);
      }
    }
  });

  return {
    subscribe,
    load: async () => {
      if (loaded) return;
      const data = await api.giornate.list();
      set(data);
      loaded = true;
    },
    reload: async () => {
      const data = await api.giornate.list();
      set(data);
      loaded = true;
    },
    invalidate: () => { loaded = false; },
  };
}

export const giornateStore = createGiornateStore();
