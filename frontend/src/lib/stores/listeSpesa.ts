import { writable } from "svelte/store";
import { api } from "../api";
import { onMessage } from "../ws";
import type { ListaSpesa } from "../types";

function createListeSpesaStore() {
  const { subscribe, update, set } = writable<ListaSpesa[]>([]);
  let loaded = false;

  onMessage(async (msg) => {
    if (msg.entity !== "lista-spesa") return;

    if (msg.type === "file_deleted") {
      update((list) => list.filter((l) => l.id !== msg.id));
    } else if (msg.type === "file_changed" || msg.type === "file_created") {
      try {
        const updated = await api.listeSpesa.get(msg.id);
        update((list) => {
          const idx = list.findIndex((l) => l.id === msg.id);
          if (idx >= 0) {
            const copy = [...list];
            copy[idx] = updated;
            return copy;
          }
          return [...list, updated];
        });
      } catch (err) {
        console.warn("[store/listeSpesa] WS update failed:", err);
      }
    }
  });

  return {
    subscribe,
    load: async () => {
      if (loaded) return;
      const data = await api.listeSpesa.list();
      set(data);
      loaded = true;
    },
    reload: async () => {
      const data = await api.listeSpesa.list();
      set(data);
      loaded = true;
    },
    invalidate: () => { loaded = false; },
  };
}

export const listeSpesaStore = createListeSpesaStore();
