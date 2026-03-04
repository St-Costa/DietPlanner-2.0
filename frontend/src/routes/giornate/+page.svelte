<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { giornateStore } from "$lib/stores/giornate";
  import { api } from "$lib/api";
  import { fmt } from "$lib/utils/nutrition";
  import type { GiornataFull } from "$lib/types";

  onMount(() => giornateStore.load());

  function sodioColor(mg: number): string {
    if (mg <= 1500) return "ok";
    if (mg <= 2300) return "warn";
    return "danger";
  }

  function colesteroloColor(mg: number): string {
    if (mg <= 200) return "ok";
    if (mg <= 300) return "warn";
    return "danger";
  }

  function kcalPct(kcal: number, total: number): string {
    if (total <= 0) return "0%";
    return (kcal / total * 100).toFixed(0) + "%";
  }

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
      <div class="day-card" role="button" tabindex="0" onclick={() => goto(`/giornate/${g.id}`)} onkeydown={(e) => e.key === 'Enter' && goto(`/giornate/${g.id}`)}>
        <div class="day-header">
          <div class="day-nome">{g.nome}</div>
          <div class="card-actions">
            <button class="delete-btn" title="Elimina giornata" onclick={(e) => { e.stopPropagation(); handleDelete(g); }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6"></path><path d="M14 11v6"></path>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
              </svg>
            </button>
          </div>
        </div>

        {#if g.ricetteDettaglio.length > 0}
          {@const t = g.totale}
          {@const kcalMacro = t.proteine * 4 + t.carboidrati * 4 + t.grassi * 9}
          <ul class="ricette-list">
            {#each g.ricetteDettaglio as r}
              <li>{r.nome}</li>
            {/each}
          </ul>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kcal</th>
                  <th>Proteine</th>
                  <th>Grassi</th>
                  <th>Carbo</th>
                  <th>Fibre</th>
                  <th>Sodio</th>
                  <th>Chol</th>
                </tr>
              </thead>
              <tbody>
                <tr class="total-row">
                  <td>{fmt(t.kcal, 0)}</td>
                  <td>
                    {fmt(t.proteine)}
                    <span class="pct">{kcalPct(t.proteine * 4, kcalMacro)}</span>
                  </td>
                  <td>
                    {fmt(t.grassi)}
                    <span class="pct">{kcalPct(t.grassi * 9, kcalMacro)}</span>
                  </td>
                  <td>
                    {fmt(t.carboidrati)}
                    <span class="pct">{kcalPct(t.carboidrati * 4, kcalMacro)}</span>
                  </td>
                  <td>{fmt(t.fibre)}</td>
                  <td class="health-{sodioColor(t.sodio)}">{fmt(t.sodio, 0)}</td>
                  <td class="health-{colesteroloColor(t.colesterolo)}">{fmt(t.colesterolo, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        {:else}
          <span class="no-ricette">Nessuna ricetta</span>
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
  .cards { display: flex; flex-direction: column; gap: 1.25rem; }
  .day-card { background: #fff; border: 1px solid #dee2e6; border-radius: 10px; padding: 1.25rem; cursor: pointer; }
  .day-card:hover { border-color: #adb5bd; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .day-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
  .day-nome { font-size: 1.1rem; font-weight: 700; }
  .card-actions { display: flex; align-items: center; gap: 0.4rem; }
  .delete-btn { background: none; border: 1px solid #dee2e6; border-radius: 6px; cursor: pointer; color: #fa5252; padding: 0.35rem 0.45rem; display: inline-flex; align-items: center; opacity: 0.7; }
  .delete-btn:hover { opacity: 1; background: #fff5f5; border-color: #ffa8a8; }
  .ricette-list { list-style: none; padding: 0; margin: 0 0 0.75rem 0; display: flex; flex-direction: column; gap: 0; }
  .ricette-list li { font-size: 0.88rem; color: #495057; padding: 0.2rem 0; border-bottom: 1px solid #f1f3f5; }
  .ricette-list li:last-child { border-bottom: none; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th { padding: 0.35rem 0.6rem; background: #f1f3f5; border-bottom: 2px solid #dee2e6; text-align: center; white-space: nowrap; font-size: 0.78rem; color: #495057; }
  td { padding: 0.35rem 0.6rem; white-space: nowrap; text-align: center; vertical-align: middle; }
  .total-row td { font-weight: 700; font-size: 1.05rem; }
  .pct { display: block; font-size: 0.75rem; font-weight: 400; color: #868e96; }
  .health-ok { color: #2f9e44; }
  .health-warn { color: #e67700; }
  .health-danger { color: #c92a2a; }
  .no-ricette { color: #adb5bd; font-size: 0.85rem; }
</style>
