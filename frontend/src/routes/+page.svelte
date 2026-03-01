<script lang="ts">
  import { onMount } from "svelte";
  import { giornateStore } from "$lib/stores/giornate";
  import { api } from "$lib/api";
  import type { GiornataFull } from "$lib/types";

  let showSpesa = $state(false);
  let selezioni = $state<{ giornata: GiornataFull; moltiplicatore: number }[]>([]);
  let generando = $state(false);
  let erroreSpesa = $state<string | null>(null);

  onMount(() => giornateStore.load());

  function toggleGiornata(g: GiornataFull) {
    const idx = selezioni.findIndex((s) => s.giornata.id === g.id);
    if (idx >= 0) {
      selezioni = selezioni.filter((_, i) => i !== idx);
    } else {
      selezioni = [...selezioni, { giornata: g, moltiplicatore: 1 }];
    }
  }

  function isSelected(id: string) {
    return selezioni.some((s) => s.giornata.id === id);
  }

  function setMoltiplicatore(id: string, val: number) {
    selezioni = selezioni.map((s) =>
      s.giornata.id === id ? { ...s, moltiplicatore: val } : s
    );
  }

  async function generaListaSpesa() {
    erroreSpesa = null;
    generando = true;
    try {
      const html = await api.listaSpesa.genera(
        selezioni.map((s) => ({ giornataId: s.giornata.id, moltiplicatore: s.moltiplicatore }))
      );
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lista-spesa.html";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      erroreSpesa = "Errore durante la generazione della lista.";
    } finally {
      generando = false;
    }
  }
</script>

<h1>DietPlanner</h1>

<nav class="home-links">
  <a href="/ingredienti">🥕 Ingredienti</a>
  <a href="/ricette">🍳 Ricette</a>
  <a href="/giornate">📅 Giornate</a>
</nav>

<div class="spesa-section">
  <button class="btn-spesa" onclick={() => (showSpesa = !showSpesa)}>
    {showSpesa ? "Chiudi" : "🛒 Crea lista della spesa"}
  </button>

  {#if showSpesa}
    <div class="spesa-panel">
      <h2>Seleziona le giornate</h2>
      {#if $giornateStore.length === 0}
        <p class="empty">Nessuna giornata disponibile. <a href="/giornate/nuovo">Creane una</a>.</p>
      {:else}
        <div class="giornate-grid">
          {#each $giornateStore as g}
            <label class="giornata-item" class:selected={isSelected(g.id)}>
              <input
                type="checkbox"
                checked={isSelected(g.id)}
                onchange={() => toggleGiornata(g)}
              />
              <span class="g-nome">{g.nome}</span>
              {#if isSelected(g.id)}
                <div class="mult-row">
                  <span class="mult-label">×</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    step="1"
                    class="mult-input"
                    value={selezioni.find((s) => s.giornata.id === g.id)?.moltiplicatore ?? 1}
                    oninput={(e) => setMoltiplicatore(g.id, parseInt((e.target as HTMLInputElement).value) || 1)}
                  />
                </div>
              {/if}
            </label>
          {/each}
        </div>

        {#if erroreSpesa}
          <div class="error">{erroreSpesa}</div>
        {/if}

        <button
          class="btn-genera"
          disabled={selezioni.length === 0 || generando}
          onclick={generaListaSpesa}
        >
          {generando ? "Generazione..." : "Genera e scarica HTML"}
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  h1 { margin-bottom: 1.5rem; font-size: 1.75rem; }
  h2 { font-size: 1rem; margin-bottom: 0.75rem; color: #495057; }
  .home-links { display: flex; gap: 0.75rem; margin-bottom: 2rem; flex-wrap: wrap; }
  .home-links a {
    padding: 0.75rem 1.25rem;
    background: #fff;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    text-decoration: none;
    color: #228be6;
    font-weight: 500;
    font-size: 1rem;
  }
  .home-links a:hover { background: #e7f5ff; border-color: #74c0fc; }
  .spesa-section { max-width: 600px; }
  .btn-spesa {
    padding: 0.65rem 1.25rem;
    background: #2f9e44;
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    margin-bottom: 1rem;
  }
  .btn-spesa:hover { background: #2b8a3e; }
  .spesa-panel { background: #fff; border: 1px solid #dee2e6; border-radius: 10px; padding: 1.25rem; }
  .giornate-grid { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
  .giornata-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.75rem;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.1s;
    flex-wrap: wrap;
  }
  .giornata-item.selected { background: #f3faf3; border-color: #40c057; }
  .g-nome { flex: 1; font-weight: 500; }
  .mult-row { display: flex; align-items: center; gap: 0.35rem; }
  .mult-label { font-weight: 700; font-size: 1rem; }
  .mult-input { width: 3.5rem; padding: 0.25rem 0.4rem; border: 1px solid #ced4da; border-radius: 4px; font-size: 0.9rem; text-align: center; }
  .empty { color: #868e96; font-size: 0.9rem; margin-bottom: 1rem; }
  .error { padding: 0.6rem; background: #fff5f5; border: 1px solid #ff8787; border-radius: 5px; color: #c92a2a; margin-bottom: 0.75rem; font-size: 0.9rem; }
  .btn-genera {
    width: 100%;
    padding: 0.65rem;
    background: #228be6;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
  }
  .btn-genera:hover:not(:disabled) { background: #1c7ed6; }
  .btn-genera:disabled { opacity: 0.5; cursor: default; }
</style>
