<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { giornateStore } from "$lib/stores/giornate";
  import { api } from "$lib/api";
  import { fmt } from "$lib/utils/nutrition";
  import NutritionSummaryCard from "$lib/components/NutritionSummaryCard.svelte";
  import type { GiornataFull } from "$lib/types";

  onMount(() => giornateStore.load());

  async function handleDelete(g: GiornataFull) {
    const ok = window.confirm(`Eliminare la giornata "${g.nome}"?`);
    if (!ok) return;
    await api.giornate.delete(g.id);
    await giornateStore.reload();
  }
</script>

<div class="header">
  <h1>Giornate</h1>
  <a href="/giornate/nuovo" class="btn-primary">+ Nuova</a>
</div>

{#if $giornateStore.length === 0}
  <p class="empty">Nessuna giornata. <a href="/giornate/nuovo">Creane una.</a></p>
{:else}
  <div class="cards">
    {#each $giornateStore as g}
      <div class="day-card">
        <div class="day-header">
          <div>
            <div class="day-nome">{g.nome}</div>
            {#if g.data}<div class="day-data">{g.data}</div>{/if}
          </div>
          <div class="card-actions">
            <button class="edit-btn" onclick={() => goto(`/giornate/${g.id}`)}>Modifica</button>
            <button class="delete-btn" title="Elimina giornata" onclick={() => handleDelete(g)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6"></path><path d="M14 11v6"></path>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="ricette-list">
          {#each g.ricetteDettaglio as r}
            <div class="ricetta-row">
              <span class="r-nome">{r.nome}</span>
              <span class="r-kcal">{fmt(r.nutrizione.kcal, 0)} kcal</span>
            </div>
          {/each}
          {#if g.ricetteDettaglio.length === 0}
            <span class="no-ricette">Nessuna ricetta</span>
          {/if}
        </div>

        <NutritionSummaryCard totale={g.totale} label="Totale giornata" />
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
  .cards { display: flex; flex-direction: column; gap: 1.25rem; }
  .day-card { background: #fff; border: 1px solid #dee2e6; border-radius: 10px; padding: 1.25rem; }
  .day-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.75rem; }
  .day-nome { font-size: 1.1rem; font-weight: 700; }
  .day-data { font-size: 0.82rem; color: #868e96; margin-top: 0.15rem; }
  .card-actions { display: flex; align-items: center; gap: 0.4rem; }
  .edit-btn { padding: 0.35rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; background: #fff; cursor: pointer; font-size: 0.85rem; }
  .edit-btn:hover { background: #f1f3f5; }
  .delete-btn { background: none; border: 1px solid #dee2e6; border-radius: 6px; cursor: pointer; color: #fa5252; padding: 0.35rem 0.45rem; display: inline-flex; align-items: center; opacity: 0.7; }
  .delete-btn:hover { opacity: 1; background: #fff5f5; border-color: #ffa8a8; }
  .ricette-list { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.75rem; }
  .ricetta-row { display: flex; justify-content: space-between; font-size: 0.88rem; padding: 0.25rem 0; border-bottom: 1px solid #f1f3f5; }
  .r-nome { flex: 1; }
  .r-kcal { color: #868e96; }
  .no-ricette { color: #adb5bd; font-size: 0.85rem; }
</style>
