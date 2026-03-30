<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { listeSpesaStore } from "$lib/stores/listeSpesa";
  import { api } from "$lib/api";
  import type { ListaSpesa } from "$lib/types";

  onMount(() => listeSpesaStore.load());

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("it-IT", { dateStyle: "medium" });
  }

  async function handleDelete(l: ListaSpesa) {
    const ok = window.confirm(`Eliminare "${l.nome}"?`);
    if (!ok) return;
    await api.listeSpesa.delete(l.id);
    await listeSpesaStore.reload();
  }
</script>

<div class="header">
  <h1>Liste Spesa</h1>
  <a href="/liste-spesa/nuovo" class="btn-primary">+ Nuova</a>
</div>

{#if $listeSpesaStore.length === 0}
  <p class="empty">Nessuna lista della spesa. <a href="/liste-spesa/nuovo">Creane una.</a></p>
{:else}
  <div class="cards">
    {#each $listeSpesaStore as l}
      <div class="card" role="button" tabindex="0" onclick={() => goto(`/liste-spesa/${l.id}`)} onkeydown={(e) => e.key === 'Enter' && goto(`/liste-spesa/${l.id}`)}>
        <div class="card-header">
          <div class="card-nome">{l.nome}</div>
          <div class="card-actions">
            <button class="delete-btn" title="Elimina lista" onclick={(e) => { e.stopPropagation(); handleDelete(l); }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6"></path><path d="M14 11v6"></path>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="card-meta">
          <span>{formatDate(l.created_at)}</span>
          <span class="sep">·</span>
          <span>{l.items.length} ingredienti</span>
          {#if l.costoTotale !== null}
            <span class="sep">·</span>
            <span class="costo">{l.costoTotale.toFixed(2)}</span>
          {/if}
        </div>
        {#if l.selezione.length > 0}
          <div class="card-selezione">
            {#each l.selezione as s}
              <span class="tag">{s.giornataId}{#if s.moltiplicatore > 1} ×{s.moltiplicatore}{/if}</span>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
  h1 { font-size: 1.5rem; }
  .btn-primary { padding: 0.5rem 1rem; background: #228be6; color: #fff; text-decoration: none; border-radius: 6px; font-size: 0.9rem; font-weight: 500; }
  .btn-primary:hover { background: #1c7ed6; }
  .empty { color: #868e96; }
  .cards { display: flex; flex-direction: column; gap: 1rem; }
  .card { background: #fff; border: 1px solid #dee2e6; border-radius: 10px; padding: 1.25rem; cursor: pointer; }
  .card:hover { border-color: #adb5bd; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
  .card-nome { font-size: 1.1rem; font-weight: 700; }
  .card-actions { display: flex; align-items: center; gap: 0.4rem; }
  .delete-btn { background: none; border: 1px solid #dee2e6; border-radius: 6px; cursor: pointer; color: #fa5252; padding: 0.35rem 0.45rem; display: inline-flex; align-items: center; opacity: 0.7; }
  .delete-btn:hover { opacity: 1; background: #fff5f5; border-color: #ffa8a8; }
  .card-meta { font-size: 0.85rem; color: #868e96; display: flex; align-items: center; gap: 0.4rem; }
  .sep { color: #ced4da; }
  .costo { font-weight: 600; color: #495057; }
  .costo::before { content: "€"; }
  .card-selezione { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.6rem; }
  .tag { font-size: 0.78rem; background: #e7f5ff; color: #1971c2; padding: 0.15rem 0.5rem; border-radius: 4px; }
</style>
