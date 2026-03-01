<script lang="ts">
  import { onMount } from "svelte";
  import { api, ApiError } from "../api";
  import { ricetteStore } from "../stores/ricette";
  import { giornateStore } from "../stores/giornate";
  import { goto } from "$app/navigation";
  import { sumNutrition, zeroNutrition } from "../utils/nutrition";
  import RecipeCard from "./RecipeCard.svelte";
  import RecipePicker from "./RecipePicker.svelte";
  import NutritionSummaryCard from "./NutritionSummaryCard.svelte";
  import type { GiornataFull, GiornataRicettaDettaglio, GiornataInput } from "../types";

  let {
    giornata = null,
  }: {
    giornata?: GiornataFull | null;
  } = $props();

  const isEdit = $derived(!!giornata);

  let nome = $state(giornata?.nome ?? "");
  let data = $state(giornata?.data ?? new Date().toISOString().split("T")[0]);
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
      data: data || null,
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

  <div class="row">
    <label>
      Nome giornata *
      <input bind:value={nome} required placeholder="es. Lunedì tipo" />
    </label>
    <label>
      Data (opzionale)
      <input type="date" bind:value={data} />
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
      <div class="recipe-list">
        {#each ricetteSelezionate as r}
          <RecipeCard ricetta={r} onremove={() => removeRicetta(r.id)} />
        {/each}
      </div>
      <div class="summary-wrap">
        <NutritionSummaryCard {totale} />
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
  .row { display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; margin-bottom: 1.25rem; }
  label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; font-weight: 500; }
  input { padding: 0.45rem 0.6rem; border: 1px solid #ced4da; border-radius: 4px; font-size: 0.9rem; }
  input:focus { outline: 2px solid #228be6; border-color: transparent; }
  section { margin-bottom: 1.5rem; padding: 1rem; background: #fff; border: 1px solid #dee2e6; border-radius: 8px; }
  .picker-wrap { margin-bottom: 1rem; max-width: 400px; }
  .recipe-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
  .summary-wrap { margin-top: 0.5rem; }
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
