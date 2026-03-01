import { writable } from "svelte/store";
import { api } from "../api";
import { onMessage } from "../ws";
import type { RicettaFull } from "../types";

function createRicetteStore() {
  const { subscribe, update, set } = writable<RicettaFull[]>([]);
  let loaded = false;

  onMessage(async (msg) => {
    if (msg.entity !== "ricetta") return;

    if (msg.type === "file_deleted") {
      update((list) => list.filter((r) => r.id !== msg.id));
    } else if (msg.type === "file_changed" || msg.type === "file_created") {
      try {
        const updated = await api.ricette.get(msg.id);
        update((list) => {
          const idx = list.findIndex((r) => r.id === msg.id);
          if (idx >= 0) {
            const copy = [...list];
            copy[idx] = updated;
            return copy;
          }
          return [...list, updated];
        });
      } catch (err) {
        console.warn("[store/ricette] WS update failed:", err);
      }
    }
  });

  // Ingredienti changes invalidate ricette nutrition
  onMessage(async (msg) => {
    if (msg.entity === "ingrediente" && (msg.type === "file_changed" || msg.type === "file_deleted")) {
      // Reload all ricette to recompute nutrition
      try {
        const data = await api.ricette.list();
        set(data);
      } catch (err) {
        console.warn("[store/ricette] ingredient change reload failed:", err);
      }
    }
  });

  return {
    subscribe,
    load: async () => {
      if (loaded) return;
      const data = await api.ricette.list();
      set(data);
      loaded = true;
    },
    reload: async () => {
      const data = await api.ricette.list();
      set(data);
      loaded = true;
    },
    invalidate: () => { loaded = false; },
  };
}

export const ricetteStore = createRicetteStore();
