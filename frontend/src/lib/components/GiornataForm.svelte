<script lang="ts">
  import { onMount } from "svelte";
  import { api, ApiError } from "../api";
  import { ricetteStore } from "../stores/ricette";
  import { giornateStore } from "../stores/giornate";
  import { goto } from "$app/navigation";
  import { sumNutrition, fmt } from "../utils/nutrition";
  import RecipePicker from "./RecipePicker.svelte";
  import MacroPieChart from "./MacroPieChart.svelte";
  import type { GiornataFull, GiornataRicettaDettaglio, GiornataInput } from "../types";

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

  let {
    giornata = null,
  }: {
    giornata?: GiornataFull | null;
  } = $props();

  const isEdit = $derived(!!giornata);

  let nome = $state(giornata?.nome ?? "");
  let ricetteSelezionate = $state<GiornataRicettaDettaglio[]>(
    giornata?.ricetteDettaglio ?? []
  );
  let error = $state<string | null>(null);
  let loading = $state(false);
  let deleteConfirm = $state(false);

  let totale = $derived(sumNutrition(ricetteSelezionate.map((r) => r.nutrizione)));

  onMount(async () => {
    await ricetteStore.load();
  });

  function addRicetta(r: { id: string; nome: string; nutrizione: GiornataRicettaDettaglio["nutrizione"] }) {
    if (ricetteSelezionate.some((s) => s.id === r.id)) return;
    ricetteSelezionate = [...ricetteSelezionate, { id: r.id, nome: r.nome, nutrizione: r.nutrizione }];
  }

  function removeRicetta(id: string) {
    ricetteSelezionate = ricetteSelezionate.filter((r) => r.id !== id);
  }

  function buildInput(): GiornataInput {
    return {
      nome,
      ricette: ricetteSelezionate.map((r) => r.id),
    };
  }

  async function handleSubmit() {
    error = null;
    loading = true;
    try {
      const input = buildInput();
      if (isEdit && giornata) {
        await api.giornate.update(giornata.id, input);
      } else {
        await api.giornate.create(input);
      }
      await giornateStore.reload();
      goto("/giornate");
    } catch (e) {
      error = e instanceof ApiError ? String(e.body.error) : "Errore di rete";
    } finally {
      loading = false;
    }
  }

  async function handleDelete() {
    if (!deleteConfirm || !giornata) return;
    loading = true;
    try {
      await api.giornate.delete(giornata.id);
      await giornateStore.reload();
      goto("/giornate");
    } catch {
      error = "Errore durante eliminazione";
    } finally {
      loading = false;
    }
  }
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
  <div class="form-header">
    <h1>{isEdit ? "Modifica Giornata" : "Nuova Giornata"}</h1>
    <div class="header-actions">
      <button type="submit" class="btn-primary" disabled={loading}>
        {loading ? "Salvataggio..." : isEdit ? "Salva" : "Crea giornata"}
      </button>
      <a href="/giornate" class="btn-secondary">Annulla</a>
    </div>
  </div>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  <div class="nome-wrap">
    <label>
      Nome giornata *
      <input bind:value={nome} required placeholder="es. Lunedì tipo" />
    </label>
  </div>

  <section>
    <h2>Ricette</h2>
    <div class="picker-wrap">
      <RecipePicker
        ricette={$ricetteStore}
        onselect={(r) => addRicetta({ id: r.id, nome: r.nome, nutrizione: r.nutrizione })}
      />
    </div>

    {#if ricetteSelezionate.length > 0}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ricetta</th>
              <th class="num">Kcal</th>
              <th class="num">Proteine</th>
              <th class="num">Grassi</th>
              <th class="num">Carbo</th>
              <th class="num">Fibre</th>
              <th class="num">Sodio</th>
              <th class="num">Chol</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each ricetteSelezionate as r}
              {@const n = r.nutrizione}
              <tr>
                <td>{r.nome}</td>
                <td class="num">{n.kcal.toFixed(0)}</td>
                <td class="num">{n.proteine.toFixed(1)}</td>
                <td class="num">{n.grassi.toFixed(1)} <span class="sub">({n.saturi.toFixed(1)})</span></td>
                <td class="num">{n.carboidrati.toFixed(1)} <span class="sub">({n.zuccheri.toFixed(1)})</span></td>
                <td class="num">{n.fibre.toFixed(1)}</td>
                <td class="num">{n.sodio.toFixed(0)}</td>
                <td class="num">{n.colesterolo.toFixed(0)}</td>
                <td>
                  <button type="button" class="rm-btn" onclick={() => removeRicetta(r.id)}>✕</button>
                </td>
              </tr>
            {/each}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td class="label">Totale</td>
              <td class="num">{fmt(totale.kcal, 0)}</td>
              <td class="num">{fmt(totale.proteine)}</td>
              <td class="num">{fmt(totale.grassi)} <span class="sub">({fmt(totale.saturi)})</span></td>
              <td class="num">{fmt(totale.carboidrati)} <span class="sub">({fmt(totale.zuccheri)})</span></td>
              <td class="num">{fmt(totale.fibre)}</td>
              <td class="num health-{sodioColor(totale.sodio)}">{fmt(totale.sodio, 0)}</td>
              <td class="num health-{colesteroloColor(totale.colesterolo)}">{fmt(totale.colesterolo, 0)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="pie-wrap">
        <MacroPieChart
          proteine={totale.proteine}
          carboidrati={totale.carboidrati}
          grassi={totale.grassi}
          showGrams={true}
        />
      </div>
    {:else}
      <p class="empty">Nessuna ricetta aggiunta. Cerca sopra per aggiungerne.</p>
    {/if}
  </section>

  {#if isEdit}
    <div class="delete-zone">
      {#if deleteConfirm}
        <button type="button" class="btn-danger" onclick={handleDelete} disabled={loading}>Conferma eliminazione</button>
        <button type="button" onclick={() => (deleteConfirm = false)}>Annulla</button>
      {:else}
        <button type="button" class="btn-ghost-danger" onclick={() => (deleteConfirm = true)}>Elimina giornata</button>
      {/if}
    </div>
  {/if}
</form>

<style>
  .form-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1rem; margin-bottom: 0.75rem; color: #495057; }
  .header-actions { display: flex; gap: 0.5rem; }
  .nome-wrap { margin-bottom: 1.25rem; max-width: 400px; }
  label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; font-weight: 500; }
  input { padding: 0.45rem 0.6rem; border: 1px solid #ced4da; border-radius: 4px; font-size: 0.9rem; }
  input:focus { outline: 2px solid #228be6; border-color: transparent; }
  section { margin-bottom: 1.5rem; padding: 1rem; background: #fff; border: 1px solid #dee2e6; border-radius: 8px; }
  .picker-wrap { margin-bottom: 1rem; max-width: 400px; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th { padding: 0.4rem 0.6rem; background: #f1f3f5; border-bottom: 2px solid #dee2e6; text-align: center; vertical-align: middle; white-space: nowrap; }
  td { padding: 0.4rem 0.6rem; border-bottom: 1px solid #f1f3f5; white-space: nowrap; text-align: center; vertical-align: middle; }
  td.label { font-weight: 500; text-align: left; }
  td.num { text-align: center; }
  .sub { color: #868e96; font-size: 0.8em; }
  .rm-btn { background: none; border: none; cursor: pointer; color: #868e96; font-size: 0.85rem; padding: 0.2rem 0.4rem; }
  .rm-btn:hover { color: #fa5252; }
  .total-row td { font-weight: 700; font-size: 1.05rem; background: #f8f9fa; border-top: 2px solid #dee2e6; border-bottom: none; }
  .health-ok { color: #2f9e44; font-weight: 700; }
  .health-warn { color: #e67700; font-weight: 700; }
  .health-danger { color: #c92a2a; font-weight: 700; }
  .pie-wrap { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #f1f3f5; }
  .empty { color: #868e96; font-size: 0.9rem; }
  .error { padding: 0.75rem; background: #fff5f5; border: 1px solid #ff8787; border-radius: 6px; color: #c92a2a; margin-bottom: 1rem; }
  .delete-zone { display: flex; gap: 0.5rem; margin-top: 1rem; }
  .btn-primary { padding: 0.5rem 1.25rem; background: #228be6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 500; }
  .btn-primary:hover:not(:disabled) { background: #1c7ed6; }
  .btn-primary:disabled { opacity: 0.6; }
  .btn-secondary { padding: 0.5rem 1rem; border: 1px solid #ced4da; border-radius: 6px; text-decoration: none; color: #495057; font-size: 0.9rem; }
  .btn-secondary:hover { background: #f1f3f5; }
  .btn-ghost-danger { background: none; border: none; color: #fa5252; cursor: pointer; font-size: 0.85rem; }
  .btn-ghost-danger:hover { text-decoration: underline; }
  .btn-danger { padding: 0.5rem 1rem; background: #fa5252; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
</style>
