<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { giornateStore } from "$lib/stores/giornate";
  import { api } from "$lib/api";
  import type { GiornataFull } from "$lib/types";

  let nome = $state("");
  let selezioni = $state<{ giornata: GiornataFull; moltiplicatore: number }[]>([]);
  let creando = $state(false);
  let errore = $state<string | null>(null);

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

  async function creaLista() {
    errore = null;
    creando = true;
    try {
      const lista = await api.listeSpesa.create({
        nome: nome.trim() || undefined,
        selezione: selezioni.map((s) => ({ giornataId: s.giornata.id, moltiplicatore: s.moltiplicatore })),
      });
      goto(`/liste-spesa/${lista.id}`);
    } catch {
      errore = "Errore durante la creazione della lista.";
    } finally {
      creando = false;
    }
  }
</script>

<div class="header">
  <a href="/liste-spesa" class="back">&larr; Liste Spesa</a>
  <h1>Nuova lista della spesa</h1>
</div>

<div class="form">
  <label class="nome-field">
    <span class="label">Nome (opzionale)</span>
    <input
      type="text"
      bind:value={nome}
      placeholder="Lista spesa - {new Date().toLocaleDateString('it-IT', { dateStyle: 'long' })}"
    />
  </label>

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

    {#if errore}
      <div class="error">{errore}</div>
    {/if}

    <button
      class="btn-crea"
      disabled={selezioni.length === 0 || creando}
      onclick={creaLista}
    >
      {creando ? "Creazione..." : "Crea lista della spesa"}
    </button>
  {/if}
</div>

<style>
  .header { margin-bottom: 1.25rem; }
  .back { color: #868e96; text-decoration: none; font-size: 0.85rem; }
  .back:hover { color: #228be6; }
  h1 { font-size: 1.5rem; margin-top: 0.25rem; }
  h2 { font-size: 1rem; margin-bottom: 0.75rem; color: #495057; }
  .form { max-width: 600px; background: #fff; border: 1px solid #dee2e6; border-radius: 10px; padding: 1.25rem; }
  .nome-field { display: block; margin-bottom: 1.25rem; }
  .nome-field .label { display: block; font-size: 0.85rem; color: #495057; margin-bottom: 0.3rem; font-weight: 500; }
  .nome-field input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.95rem; }
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
  .btn-crea {
    width: 100%;
    padding: 0.65rem;
    background: #2f9e44;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
  }
  .btn-crea:hover:not(:disabled) { background: #2b8a3e; }
  .btn-crea:disabled { opacity: 0.5; cursor: default; }
</style>
