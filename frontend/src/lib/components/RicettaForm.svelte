<script lang="ts">
  import { onMount } from "svelte";
  import { api, ApiError } from "../api";
  import { ingredientiStore } from "../stores/ingredienti";
  import { ricetteStore } from "../stores/ricette";
  import { goto, beforeNavigate } from "$app/navigation";
  import { scaleNutrition, toGrams, sumNutrition, zeroNutrition } from "../utils/nutrition";
  import MarkdownEditor from "./MarkdownEditor.svelte";
  import IngredientPicker from "./IngredientPicker.svelte";
  import QuantityInput from "./QuantityInput.svelte";
  import NutritionRow from "./NutritionRow.svelte";
  import MacroPieChart from "./MacroPieChart.svelte";
  import SpiderChart from "./SpiderChart.svelte";
  import type { SpiderEntry } from "./SpiderChart.svelte";
  import OmegaBarChart from "./OmegaBarChart.svelte";
  import { settingsStore, VITAMINE_DEF, MINERALI_DEF } from "../stores/settings";
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

  // ─── Auto-save (edit mode only) ───────────────────────────────────────────
  let initialized = false;
  let autoSaveTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  let pendingSave = false;
  let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function saveNow() {
    if (!initialized || !isEdit || !ricetta) return;
    if (autoSaveTimer !== undefined) { clearTimeout(autoSaveTimer); autoSaveTimer = undefined; }
    pendingSave = false;
    saveStatus = 'saving';
    try {
      await api.ricette.update(ricetta!.id, { nome, ingredienti: buildIngredienteEntries(), preparazione });
      saveStatus = 'saved';
      setTimeout(() => { if (saveStatus === 'saved') saveStatus = 'idle'; }, 2000);
    } catch {
      saveStatus = 'error';
    }
  }

  function scheduleAutoSave() {
    if (!initialized || !isEdit || !ricetta) return;
    if (autoSaveTimer !== undefined) clearTimeout(autoSaveTimer);
    pendingSave = true;
    autoSaveTimer = setTimeout(() => { autoSaveTimer = undefined; saveNow(); }, 300);
  }

  $effect(() => {
    // Track only text/quantita — discrete actions (add/remove) call saveNow() directly
    const _deps = [nome, preparazione, ...rows.map(r => r.quantita)];
    scheduleAutoSave();
    return () => { if (autoSaveTimer !== undefined) clearTimeout(autoSaveTimer); };
  });

  beforeNavigate(({ cancel, to }) => {
    if (!pendingSave) return;
    cancel();
    saveNow().then(() => { if (to) goto(to.url.pathname + to.url.search + to.url.hash); });
  });

  // Settings modal state
  let settingsOpen = $state(false);
  let editVitamine = $state<Record<string, string>>({});
  let editMinerali = $state<Record<string, string>>({});
  let editOmega = $state({ omega3: "", omega6: "" });

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
    // Enable auto-save after mount effects flush (setTimeout > microtasks)
    setTimeout(() => { initialized = true; }, 0);
  });

  function addIngrediente(ing: Ingrediente) {
    if (rows.some((r) => r.ing.id === ing.id)) return; // already added
    rows = [...rows, { ing, quantita: ing.peso_unita ? 1 : 100 }];
    saveNow();
  }

  function removeRow(idx: number) {
    rows = rows.filter((_, i) => i !== idx);
    saveNow();
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

  // Aggregate extra_nutrienti (vitamins, minerals) from all rows scaled by grams
  function computeExtraAgg(): Record<string, number> {
    const agg: Record<string, number> = {};
    for (const row of rows) {
      const grammi = toGrams({ id: row.ing.id, quantita: row.quantita, unita: row.ing.nome_unita ?? "g" }, row.ing);
      for (const [key, { valore }] of Object.entries(row.ing.extra_nutrienti ?? {})) {
        agg[key] = (agg[key] ?? 0) + (valore * grammi) / 100;
      }
    }
    return agg;
  }

  let hasExtraData = $derived(() =>
    rows.some((r) => r.ing.extra_nutrienti && Object.keys(r.ing.extra_nutrienti).length > 0)
  );

  let omegaData = $derived(() => {
    const extra = computeExtraAgg();
    // Try aggregated keys first, otherwise sum individual n-3/n-6 fatty acids
    if ("omega_3_fatty_acids" in extra || "omega_6_fatty_acids" in extra) {
      return { omega3: extra["omega_3_fatty_acids"] ?? 0, omega6: extra["omega_6_fatty_acids"] ?? 0 };
    }
    let omega3 = 0, omega6 = 0;
    for (const [key, val] of Object.entries(extra)) {
      if (key.includes("_n_3_")) omega3 += val;
      else if (key.includes("_n_6_")) omega6 += val;
    }
    return { omega3, omega6 };
  });

  let vitaminEntries = $derived<SpiderEntry[]>(() => {
    const extra = computeExtraAgg();
    const targets = $settingsStore.vitamine;
    return VITAMINE_DEF.map((def) => ({
      label: def.label,
      labelFull: def.labelFull,
      valore: extra[def.key] ?? 0,
      target: targets[def.key] ?? def.defaultTarget,
      unita: def.unita,
    }));
  });

  let mineralEntries = $derived<SpiderEntry[]>(() => {
    const extra = computeExtraAgg();
    const targets = $settingsStore.minerali;
    return MINERALI_DEF.map((def) => ({
      label: def.label,
      labelFull: def.labelFull,
      valore: extra[def.key] ?? 0,
      target: targets[def.key] ?? def.defaultTarget,
      unita: def.unita,
    }));
  });

  function openSettings() {
    for (const def of VITAMINE_DEF) {
      editVitamine[def.key] = String($settingsStore.vitamine[def.key] ?? def.defaultTarget);
    }
    for (const def of MINERALI_DEF) {
      editMinerali[def.key] = String($settingsStore.minerali[def.key] ?? def.defaultTarget);
    }
    editOmega = { omega3: String($settingsStore.omega.omega3), omega6: String($settingsStore.omega.omega6) };
    settingsOpen = true;
  }

  function saveSettings() {
    for (const def of VITAMINE_DEF) {
      const v = parseFloat((editVitamine[def.key] ?? "").replace(",", "."));
      if (!isNaN(v) && v > 0) settingsStore.setTarget("vitamine", def.key, v);
    }
    for (const def of MINERALI_DEF) {
      const v = parseFloat((editMinerali[def.key] ?? "").replace(",", "."));
      if (!isNaN(v) && v > 0) settingsStore.setTarget("minerali", def.key, v);
    }
    const v3 = parseFloat(editOmega.omega3.replace(",", "."));
    const v6 = parseFloat(editOmega.omega6.replace(",", "."));
    if (!isNaN(v3) && v3 > 0) settingsStore.setOmegaTarget("omega3", v3);
    if (!isNaN(v6) && v6 > 0) settingsStore.setOmegaTarget("omega6", v6);
    settingsOpen = false;
  }

  function resetSettings() {
    settingsStore.reset();
    for (const def of VITAMINE_DEF) {
      editVitamine[def.key] = String(def.defaultTarget);
    }
    for (const def of MINERALI_DEF) {
      editMinerali[def.key] = String(def.defaultTarget);
    }
    editOmega = { omega3: "2", omega6: "10" };
  }

  async function handleSubmit() {
    if (isEdit) {
      // In edit mode the form has no submit button; Enter key or programmatic submit just navigates back.
      // beforeNavigate will flush any pending debounced save automatically.
      goto("/ricette");
      return;
    }
    error = null;
    loading = true;
    try {
      await api.ricette.create({ nome, ingredienti: buildIngredienteEntries(), preparazione });
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
      {#if isEdit && saveStatus !== 'idle'}
        <span class="save-status save-status-{saveStatus}">
          {saveStatus === 'saving' ? 'Salvataggio...' : saveStatus === 'saved' ? '✓ Salvato' : '⚠ Errore salvataggio'}
        </span>
      {/if}
      {#if !isEdit}
        <button type="submit" class="btn-primary" disabled={loading}>
          {loading ? "Creazione..." : "Crea ricetta"}
        </button>
      {/if}
      <a href="/ricette" class="btn-secondary">{isEdit ? 'Indietro' : 'Annulla'}</a>
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

      {#if hasExtraData()}
        <div class="micro-section">
          <div class="micro-header">
            <span class="micro-title">Micronutrienti</span>
            <button type="button" class="settings-btn" onclick={openSettings} title="Imposta obiettivi giornalieri">
              ⚙ Obiettivi
            </button>
          </div>
          <div class="spider-charts">
            <SpiderChart entries={vitaminEntries()} title="Vitamine" />
            <SpiderChart entries={mineralEntries()} title="Minerali" />
          </div>
          {#if omegaData().omega3 > 0 || omegaData().omega6 > 0}
            <div class="omega-section">
              <OmegaBarChart
                omega3={omegaData().omega3}
                omega6={omegaData().omega6}
                omega3Target={$settingsStore.omega.omega3}
                omega6Target={$settingsStore.omega.omega6}
              />
            </div>
          {/if}
        </div>
      {/if}
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

{#if settingsOpen}
  <div class="modal-backdrop" role="presentation" onclick={() => (settingsOpen = false)}>
    <div class="modal" role="dialog" aria-modal="true" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3>Obiettivi giornalieri</h3>
        <button type="button" class="modal-close" onclick={() => (settingsOpen = false)}>✕</button>
      </div>
      <div class="modal-body">
        <h4>Vitamine</h4>
        <div class="targets-grid">
          {#each VITAMINE_DEF as def}
            <label class="target-label">
              <span class="target-name">{def.labelFull}</span>
              <div class="target-input-wrap">
                <input
                  type="text"
                  inputmode="decimal"
                  bind:value={editVitamine[def.key]}
                  class="target-input"
                />
                <span class="target-unit">{def.unita}</span>
              </div>
            </label>
          {/each}
        </div>
        <h4>Minerali</h4>
        <div class="targets-grid">
          {#each MINERALI_DEF as def}
            <label class="target-label">
              <span class="target-name">{def.labelFull}</span>
              <div class="target-input-wrap">
                <input
                  type="text"
                  inputmode="decimal"
                  bind:value={editMinerali[def.key]}
                  class="target-input"
                />
                <span class="target-unit">{def.unita}</span>
              </div>
            </label>
          {/each}
        </div>
        <h4>Omega</h4>
        <div class="targets-grid">
          <label class="target-label">
            <span class="target-name">Omega-3 totali</span>
            <div class="target-input-wrap">
              <input type="text" inputmode="decimal" bind:value={editOmega.omega3} class="target-input" />
              <span class="target-unit">g</span>
            </div>
          </label>
          <label class="target-label">
            <span class="target-name">Omega-6 totali</span>
            <div class="target-input-wrap">
              <input type="text" inputmode="decimal" bind:value={editOmega.omega6} class="target-input" />
              <span class="target-unit">g</span>
            </div>
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-ghost-danger" onclick={resetSettings}>Ripristina default</button>
        <div class="modal-footer-right">
          <button type="button" class="btn-secondary" onclick={() => (settingsOpen = false)}>Annulla</button>
          <button type="button" class="btn-primary" onclick={saveSettings}>Salva</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<svelte:window onkeydown={(e) => { if (e.key === "Escape" && settingsOpen) settingsOpen = false; }} />

<style>
  .form-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1rem; margin-bottom: 0.75rem; color: #495057; }
  .header-actions { display: flex; gap: 0.5rem; align-items: center; }
  .save-status { font-size: 0.82rem; }
  .save-status-saving { color: #868e96; }
  .save-status-saved { color: #2f9e44; }
  .save-status-error { color: #c92a2a; font-weight: 500; }
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

  /* Micronutrients spider chart section */
  .micro-section { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #f1f3f5; }
  .micro-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
  .micro-title { font-size: 0.85rem; font-weight: 600; color: #495057; }
  .settings-btn { background: none; border: 1px solid #ced4da; border-radius: 6px; padding: 0.25rem 0.6rem; font-size: 0.78rem; color: #495057; cursor: pointer; }
  .settings-btn:hover { background: #f1f3f5; }
  .spider-charts { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  @media (max-width: 640px) { .spider-charts { grid-template-columns: 1fr; } }
  .omega-section { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #f1f3f5; max-width: 420px; }

  /* Settings modal */
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
  }
  .modal {
    background: #fff; border-radius: 10px; width: min(640px, 95vw);
    max-height: 85vh; display: flex; flex-direction: column;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  }
  .modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem 1.25rem; border-bottom: 1px solid #dee2e6;
  }
  .modal-header h3 { margin: 0; font-size: 1rem; }
  .modal-close { background: none; border: none; font-size: 1rem; cursor: pointer; color: #868e96; padding: 0.25rem; }
  .modal-close:hover { color: #212529; }
  .modal-body { overflow-y: auto; padding: 1rem 1.25rem; flex: 1; }
  .modal-body h4 { font-size: 0.8rem; font-weight: 600; color: #868e96; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.5rem; }
  .modal-body h4 + .targets-grid { margin-bottom: 1.25rem; }
  .targets-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem 1rem; }
  @media (max-width: 480px) { .targets-grid { grid-template-columns: 1fr; } }
  .target-label { display: flex; flex-direction: column; gap: 0.15rem; font-size: 0.8rem; }
  .target-name { color: #495057; }
  .target-input-wrap { display: flex; align-items: center; gap: 0.3rem; }
  .target-input { width: 80px; padding: 0.3rem 0.5rem; border: 1px solid #ced4da; border-radius: 5px; font-size: 0.85rem; }
  .target-input:focus { outline: 2px solid #228be6; border-color: transparent; }
  .target-unit { font-size: 0.75rem; color: #868e96; }
  .modal-footer {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.75rem 1.25rem; border-top: 1px solid #dee2e6; gap: 0.5rem;
  }
  .modal-footer-right { display: flex; gap: 0.5rem; }
</style>
