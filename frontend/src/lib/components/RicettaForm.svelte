<script lang="ts">
  import { onMount } from "svelte";
  import { api, ApiError } from "../api";
  import { ingredientiStore } from "../stores/ingredienti";
  import { ricetteStore } from "../stores/ricette";
  import { goto } from "$app/navigation";
  import { scaleNutrition, toGrams, sumNutrition, zeroNutrition } from "../utils/nutrition";
  import MarkdownEditor from "./MarkdownEditor.svelte";
  import IngredientPicker from "./IngredientPicker.svelte";
  import QuantityInput from "./QuantityInput.svelte";
  import NutritionRow from "./NutritionRow.svelte";
  import MacroPieChart from "./MacroPieChart.svelte";
  import type { RicettaFull, RicettaIngrediente, Ingrediente, NutritionTotals } from "../types";

  let {
    ricetta = null,
  }: {
    ricetta?: RicettaFull | null;
  } = $props();

  const isEdit = $derived(!!ricetta);

  let nome = $state(ricetta?.nome ?? "");
  let preparazione = $state(ricetta?.preparazione ?? "");
  let error = $state<string | null>(null);
  let loading = $state(false);
  let deleteConfirm = $state(false);

  // Ingredient rows: { ing, quantita }
  type Row = { ing: Ingrediente; quantita: number };
  let rows = $state<Row[]>([]);

  onMount(async () => {
    await ingredientiStore.load();
    // Pre-populate rows if editing
    if (ricetta) {
      const ingMap = new Map($ingredientiStore.map((i) => [i.id, i]));
      rows = ricetta.ingredienti
        .map((entry) => {
          const ing = ingMap.get(entry.id);
          if (!ing) return null;
          return { ing, quantita: entry.quantita };
        })
        .filter((r): r is Row => r !== null);
    }
  });

  function addIngrediente(ing: Ingrediente) {
    if (rows.some((r) => r.ing.id === ing.id)) return; // already added
    rows = [...rows, { ing, quantita: ing.peso_unita ? 1 : 100 }];
  }

  function removeRow(idx: number) {
    rows = rows.filter((_, i) => i !== idx);
  }

  function buildIngredienteEntries(): RicettaIngrediente[] {
    return rows.map((r) => ({
      id: r.ing.id,
      quantita: r.quantita,
      unita: r.ing.nome_unita ?? "g",
    }));
  }

  // Reactive nutrition totals computed client-side
  let totalNutrition = $derived<NutritionTotals>(() => {
    const parts = rows.map((r) => {
      const grammi = toGrams({ id: r.ing.id, quantita: r.quantita, unita: r.ing.nome_unita ?? "g" }, r.ing);
      return scaleNutrition(r.ing, grammi);
    });
    return sumNutrition(parts);
  });

  async function handleSubmit() {
    error = null;
    loading = true;
    try {
      const input = { nome, ingredienti: buildIngredienteEntries(), preparazione };
      if (isEdit && ricetta) {
        await api.ricette.update(ricetta.id, input);
      } else {
        await api.ricette.create(input);
      }
      await ricetteStore.reload();
      goto("/ricette");
    } catch (e) {
      error = e instanceof ApiError ? String(e.body.error) : "Errore di rete";
    } finally {
      loading = false;
    }
  }

  async function handleDelete() {
    if (!deleteConfirm || !ricetta) return;
    loading = true;
    try {
      await api.ricette.delete(ricetta.id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const usedIn = e.body.usedIn as string[];
        const ok = confirm(`Usata nelle giornate: ${usedIn.join(", ")}.\nEliminare comunque?`);
        if (!ok) { loading = false; deleteConfirm = false; return; }
        await api.ricette.delete(ricetta.id, true);
      } else {
        error = "Errore durante eliminazione";
        loading = false;
        return;
      }
    }
    await ricetteStore.reload();
    goto("/ricette");
  }
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
  <div class="form-header">
    <h1>{isEdit ? "Modifica Ricetta" : "Nuova Ricetta"}</h1>
    <div class="header-actions">
      <button type="submit" class="btn-primary" disabled={loading}>
        {loading ? "Salvataggio..." : isEdit ? "Salva" : "Crea ricetta"}
      </button>
      <a href="/ricette" class="btn-secondary">Annulla</a>
    </div>
  </div>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  <label class="nome-label">
    Nome ricetta
    <input bind:value={nome} required placeholder="es. Frittata di verdure" class="nome-input" />
  </label>

  <section>
    <h2>Ingredienti</h2>
    <div class="picker-wrap">
      <IngredientPicker ingredienti={$ingredientiStore} onselect={addIngrediente} />
    </div>

    {#if rows.length > 0}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th class="num">Quantità</th>
              <th class="num">Kcal</th>
              <th class="num">Proteine</th>
              <th class="num">Fat</th>
              <th class="num">Carbo</th>
              <th class="num">Fibre</th>
              <th class="num">Sodio</th>
              <th class="num">Chol</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each rows as row, i}
              {@const grammi = toGrams({ id: row.ing.id, quantita: row.quantita, unita: row.ing.nome_unita ?? "g" }, row.ing)}
              {@const n = scaleNutrition(row.ing, grammi)}
              <tr>
                <td>{row.ing.nome}</td>
                <td class="num qty-cell">
                  <QuantityInput bind:value={rows[i].quantita} nomeUnita={row.ing.nome_unita} min={0} step={row.ing.peso_unita ? 0.5 : 1} />
                </td>
                <td class="num">{n.kcal.toFixed(0)}</td>
                <td class="num">{n.proteine.toFixed(1)}</td>
                <td class="num">{n.grassi.toFixed(1)} <span class="sub">({n.saturi.toFixed(1)})</span></td>
                <td class="num">{n.carboidrati.toFixed(1)} <span class="sub">({n.zuccheri.toFixed(1)})</span></td>
                <td class="num">{n.fibre.toFixed(1)}</td>
                <td class="num">{n.sodio.toFixed(0)}</td>
                <td class="num">{n.colesterolo.toFixed(0)}</td>
                <td>
                  <button type="button" class="rm-btn" onclick={() => removeRow(i)}>✕</button>
                </td>
              </tr>
            {/each}
          </tbody>
          <tfoot>
            <NutritionRow label="Totale" nutrition={totalNutrition()} isTotal />
          </tfoot>
        </table>
      </div>
      <div class="pie-wrap">
        <MacroPieChart
          proteine={totalNutrition().proteine}
          carboidrati={totalNutrition().carboidrati}
          grassi={totalNutrition().grassi}
          showGrams={true}
        />
      </div>
    {:else}
      <p class="empty">Nessun ingrediente aggiunto. Cerca sopra per aggiungerne.</p>
    {/if}
  </section>

  <section>
    <h2>Preparazione</h2>
    <MarkdownEditor bind:value={preparazione} placeholder="Scrivi la preparazione in markdown..." />
  </section>

  {#if isEdit}
    <div class="delete-zone">
      {#if deleteConfirm}
        <button type="button" class="btn-danger" onclick={handleDelete} disabled={loading}>Conferma eliminazione</button>
        <button type="button" onclick={() => (deleteConfirm = false)}>Annulla</button>
      {:else}
        <button type="button" class="btn-ghost-danger" onclick={() => (deleteConfirm = true)}>Elimina ricetta</button>
      {/if}
    </div>
  {/if}
</form>

<style>
  .form-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1rem; margin-bottom: 0.75rem; color: #495057; }
  .header-actions { display: flex; gap: 0.5rem; }
  .nome-label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; font-weight: 500; margin-bottom: 1.25rem; }
  .nome-input { padding: 0.55rem 0.75rem; border: 1px solid #ced4da; border-radius: 6px; font-size: 1.1rem; }
  .nome-input:focus { outline: 2px solid #228be6; border-color: transparent; }
  section { margin-bottom: 1.5rem; padding: 1rem; background: #fff; border: 1px solid #dee2e6; border-radius: 8px; }
  .picker-wrap { margin-bottom: 1rem; max-width: 400px; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th { padding: 0.4rem 0.6rem; background: #f1f3f5; border-bottom: 2px solid #dee2e6; text-align: center; vertical-align: middle; white-space: nowrap; }
  th.num { text-align: center; }
  td { padding: 0.4rem 0.6rem; border-bottom: 1px solid #f1f3f5; white-space: nowrap; text-align: center; vertical-align: middle; }
  td.num { text-align: center; }
  td.qty-cell { text-align: center; }
  .sub { color: #868e96; font-size: 0.8em; }
  .rm-btn { background: none; border: none; cursor: pointer; color: #868e96; font-size: 0.85rem; padding: 0.2rem 0.4rem; }
  .rm-btn:hover { color: #fa5252; }
  .pie-wrap { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #f1f3f5; }
  .empty { color: #868e96; font-size: 0.9rem; }
  .error { padding: 0.75rem; background: #fff5f5; border: 1px solid #ff8787; border-radius: 6px; color: #c92a2a; margin-bottom: 1rem; }
  .delete-zone { margin-top: 1rem; display: flex; gap: 0.5rem; }
  .btn-primary { padding: 0.5rem 1.25rem; background: #228be6; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 500; }
  .btn-primary:hover:not(:disabled) { background: #1c7ed6; }
  .btn-primary:disabled { opacity: 0.6; }
  .btn-secondary { padding: 0.5rem 1rem; border: 1px solid #ced4da; border-radius: 6px; text-decoration: none; color: #495057; font-size: 0.9rem; }
  .btn-secondary:hover { background: #f1f3f5; }
  .btn-ghost-danger { background: none; border: none; color: #fa5252; cursor: pointer; font-size: 0.85rem; }
  .btn-ghost-danger:hover { text-decoration: underline; }
  .btn-danger { padding: 0.5rem 1rem; background: #fa5252; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
</style>
