<script lang="ts">
  import { onMount } from "svelte";
  import { api, ApiError } from "../api";
  import { ricetteStore } from "../stores/ricette";
  import { giornateStore } from "../stores/giornate";
  import { goto, beforeNavigate } from "$app/navigation";
  import { sumNutrition, fmt } from "../utils/nutrition";
  import { settingsStore, VITAMINE_DEF, MINERALI_DEF } from "../stores/settings";
  import RecipePicker from "./RecipePicker.svelte";
  import MacroPieChart from "./MacroPieChart.svelte";
  import SpiderChart from "./SpiderChart.svelte";
  import type { SpiderEntry } from "./SpiderChart.svelte";
  import OmegaBarChart from "./OmegaBarChart.svelte";
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

  // ─── Drag & drop reorder ─────────────────────────────────────────────────
  let draggingId = $state<string | null>(null);
  let dragOverId = $state<string | null>(null);

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const oldIdx = ricetteSelezionate.findIndex((r) => r.id === draggingId);
    const newIdx = ricetteSelezionate.findIndex((r) => r.id === targetId);
    if (oldIdx === -1 || newIdx === -1) return;
    const arr = [...ricetteSelezionate];
    const [item] = arr.splice(oldIdx, 1);
    arr.splice(newIdx, 0, item);
    ricetteSelezionate = arr;
    saveNow();
  }

  // ─── Auto-save (edit mode only) ───────────────────────────────────────────
  let initialized = false;
  let autoSaveTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  let pendingSave = false;
  let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function saveNow() {
    if (!initialized || !isEdit || !giornata) return;
    if (autoSaveTimer !== undefined) { clearTimeout(autoSaveTimer); autoSaveTimer = undefined; }
    pendingSave = false;
    saveStatus = 'saving';
    try {
      await api.giornate.update(giornata!.id, buildInput());
      saveStatus = 'saved';
      setTimeout(() => { if (saveStatus === 'saved') saveStatus = 'idle'; }, 2000);
    } catch {
      saveStatus = 'error';
    }
  }

  function scheduleAutoSave() {
    if (!initialized || !isEdit || !giornata) return;
    if (autoSaveTimer !== undefined) clearTimeout(autoSaveTimer);
    pendingSave = true;
    autoSaveTimer = setTimeout(() => { autoSaveTimer = undefined; saveNow(); }, 300);
  }

  $effect(() => {
    // Track only text — discrete actions (add/remove ricetta) call saveNow() directly
    const _deps = [nome];
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

  let totale = $derived(sumNutrition(ricetteSelezionate.map((r) => r.nutrizione)));

  onMount(async () => {
    await ricetteStore.load();
    // Enable auto-save after mount effects flush (setTimeout > microtasks)
    setTimeout(() => { initialized = true; }, 0);
  });

  function addRicetta(r: { id: string; nome: string; nutrizione: GiornataRicettaDettaglio["nutrizione"]; extra_nutrienti?: GiornataRicettaDettaglio["extra_nutrienti"] }) {
    if (ricetteSelezionate.some((s) => s.id === r.id)) return;
    ricetteSelezionate = [...ricetteSelezionate, { id: r.id, nome: r.nome, nutrizione: r.nutrizione, extra_nutrienti: r.extra_nutrienti }];
    saveNow();
  }

  function removeRicetta(id: string) {
    ricetteSelezionate = ricetteSelezionate.filter((r) => r.id !== id);
    saveNow();
  }

  function buildInput(): GiornataInput {
    return {
      nome,
      ricette: ricetteSelezionate.map((r) => r.id),
    };
  }

  // ─── Spider chart data ───────────────────────────────────────────────────────

  function computeGiornataExtra(): Record<string, { valore: number; unita: string }> {
    const agg: Record<string, { valore: number; unita: string }> = {};
    for (const r of ricetteSelezionate) {
      for (const [key, { valore, unita }] of Object.entries(r.extra_nutrienti ?? {})) {
        agg[key] = { valore: (agg[key]?.valore ?? 0) + valore, unita };
      }
    }
    return agg;
  }

  let hasExtraData = $derived(() =>
    ricetteSelezionate.some((r) => r.extra_nutrienti && Object.keys(r.extra_nutrienti).length > 0)
  );

  let omegaData = $derived(() => {
    const extra = computeGiornataExtra();
    // Try aggregated keys first, otherwise sum individual n-3/n-6 fatty acids
    if ("omega_3_fatty_acids" in extra || "omega_6_fatty_acids" in extra) {
      return { omega3: extra["omega_3_fatty_acids"]?.valore ?? 0, omega6: extra["omega_6_fatty_acids"]?.valore ?? 0 };
    }
    let omega3 = 0, omega6 = 0;
    for (const [key, { valore }] of Object.entries(extra)) {
      if (key.includes("_n_3_")) omega3 += valore;
      else if (key.includes("_n_6_")) omega6 += valore;
    }
    return { omega3, omega6 };
  });

  const MOLT_KEY = "dietplanner_spesa_molt_v1";
  function loadMolt(id: string): number {
    try {
      const map = JSON.parse(localStorage.getItem(MOLT_KEY) ?? "{}") as Record<string, number>;
      return map[id] ?? 1;
    } catch { return 1; }
  }
  function saveMolt(id: string, v: number) {
    try {
      const map = JSON.parse(localStorage.getItem(MOLT_KEY) ?? "{}") as Record<string, number>;
      map[id] = v;
      localStorage.setItem(MOLT_KEY, JSON.stringify(map));
    } catch {}
  }

  let spesaMoltiplicatore = $state(giornata?.id ? loadMolt(giornata.id) : 1);

  $effect(() => {
    if (giornata?.id) saveMolt(giornata.id, spesaMoltiplicatore);
  });

  let listaIngredienti = $derived(() => {
    const agg = new Map<string, { nome: string; pesoGrammi: number; nome_unita: string | null; peso_unita: number | null }>();
    for (const rs of ricetteSelezionate) {
      const ricettaFull = $ricetteStore.find((r) => r.id === rs.id);
      if (!ricettaFull) continue;
      for (const ing of ricettaFull.ingredientiDettaglio) {
        const existing = agg.get(ing.id);
        if (existing) {
          existing.pesoGrammi += ing.pesoGrammi;
        } else {
          agg.set(ing.id, { nome: ing.nome, pesoGrammi: ing.pesoGrammi, nome_unita: ing.nome_unita, peso_unita: ing.peso_unita });
        }
      }
    }
    return Array.from(agg.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  });

  let vitaminEntries = $derived<SpiderEntry[]>(() => {
    const extra = computeGiornataExtra();
    const targets = $settingsStore.vitamine;
    return VITAMINE_DEF.map((def) => ({
      label: def.label,
      labelFull: def.labelFull,
      valore: extra[def.key]?.valore ?? 0,
      target: targets[def.key] ?? def.defaultTarget,
      unita: def.unita,
    }));
  });

  let mineralEntries = $derived<SpiderEntry[]>(() => {
    const extra = computeGiornataExtra();
    const targets = $settingsStore.minerali;
    return MINERALI_DEF.map((def) => ({
      label: def.label,
      labelFull: def.labelFull,
      valore: extra[def.key]?.valore ?? 0,
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
    for (const def of VITAMINE_DEF) editVitamine[def.key] = String(def.defaultTarget);
    for (const def of MINERALI_DEF) editMinerali[def.key] = String(def.defaultTarget);
    editOmega = { omega3: "2", omega6: "10" };
  }

  // ─── Export MD ───────────────────────────────────────────────────────────────

  async function handleExport() {
    if (!giornata) return;
    loading = true;
    try {
      const md = await api.giornate.exportMd(giornata.id);
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${giornata.nome}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      error = "Errore durante l'esportazione";
    } finally {
      loading = false;
    }
  }

  // ─── CRUD handlers ───────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (isEdit) {
      // In edit mode the form has no submit button; beforeNavigate flushes any pending save.
      goto("/giornate");
      return;
    }
    error = null;
    loading = true;
    try {
      await api.giornate.create(buildInput());
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
      {#if isEdit && giornata}
        <button type="button" class="btn-export" onclick={handleExport} disabled={loading} title="Esporta in Markdown">
          ↓ Esporta .md
        </button>
      {/if}
      {#if isEdit && saveStatus !== 'idle'}
        <span class="save-status save-status-{saveStatus}">
          {saveStatus === 'saving' ? 'Salvataggio...' : saveStatus === 'saved' ? '✓ Salvato' : '⚠ Errore salvataggio'}
        </span>
      {/if}
      {#if !isEdit}
        <button type="submit" class="btn-primary" disabled={loading}>
          {loading ? "Creazione..." : "Crea giornata"}
        </button>
      {/if}
      <a href="/giornate" class="btn-secondary">{isEdit ? 'Indietro' : 'Annulla'}</a>
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
        onselect={(r) => addRicetta({ id: r.id, nome: r.nome, nutrizione: r.nutrizione, extra_nutrienti: r.extra_nutrienti })}
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
              <tr
                class="ricetta-row"
                class:row-dragging={draggingId === r.id}
                class:row-drag-over={dragOverId === r.id && draggingId !== r.id}
                draggable={true}
                ondragstart={(e) => { draggingId = r.id; e.dataTransfer?.setData('text/plain', r.id); }}
                ondragover={(e) => { e.preventDefault(); dragOverId = r.id; }}
                ondrop={(e) => { e.preventDefault(); handleDrop(r.id); draggingId = null; dragOverId = null; }}
                ondragend={() => { draggingId = null; dragOverId = null; }}
                onclick={() => goto(`/ricette/${r.id}`)}
              >
                <td>{r.nome}</td>
                <td class="num">{n.kcal.toFixed(0)}</td>
                <td class="num">{n.proteine.toFixed(1)}</td>
                <td class="num">{n.grassi.toFixed(1)} <span class="sub">({n.saturi.toFixed(1)})</span></td>
                <td class="num">{n.carboidrati.toFixed(1)} <span class="sub">({n.zuccheri.toFixed(1)})</span></td>
                <td class="num">{n.fibre.toFixed(1)}</td>
                <td class="num">{n.sodio.toFixed(0)}</td>
                <td class="num">{n.colesterolo.toFixed(0)}</td>
                <td class="action-cell" onclick={(e) => e.stopPropagation()}>
                  <span class="drag-handle" title="Trascina per riordinare">⠿</span>
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

      {#if listaIngredienti().length > 0}
        <div class="spesa-section">
          <div class="spesa-header">
            <span class="spesa-title">Ingredienti</span>
            <label class="spesa-molt-label">
              × <input
                type="text"
                inputmode="decimal"
                class="spesa-molt-input"
                value={spesaMoltiplicatore}
                oninput={(e) => {
                  const v = parseFloat((e.currentTarget.value).replace(",", "."));
                  if (!isNaN(v) && v > 0) spesaMoltiplicatore = v;
                }}
                title="Moltiplicatore giorni"
              />
              <span class="spesa-molt-hint">giorni</span>
            </label>
          </div>
          <ul class="spesa-list">
            {#each listaIngredienti() as item}
              {@const totalGrammi = item.pesoGrammi * spesaMoltiplicatore}
              <li>
                <span class="spesa-nome">{item.nome}</span>
                {#if item.nome_unita && item.peso_unita}
                  <span class="spesa-qty">{+(totalGrammi / item.peso_unita).toFixed(2)} {item.nome_unita}</span>
                {:else}
                  <span class="spesa-qty">{totalGrammi.toFixed(0)} g</span>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
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
                <input type="text" inputmode="decimal" bind:value={editVitamine[def.key]} class="target-input" />
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
                <input type="text" inputmode="decimal" bind:value={editMinerali[def.key]} class="target-input" />
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
  .ricetta-row { cursor: pointer; }
  .ricetta-row:hover td { background: #e7f5ff; }
  .action-cell { display: flex; align-items: center; justify-content: center; gap: 0.1rem; }
  .drag-handle { cursor: grab; color: #adb5bd; font-size: 1rem; padding: 0.2rem 0.3rem; user-select: none; line-height: 1; }
  .drag-handle:hover { color: #495057; }
  .drag-handle:active { cursor: grabbing; }
  .rm-btn { background: none; border: none; cursor: pointer; color: #868e96; font-size: 0.85rem; padding: 0.2rem 0.4rem; }
  .rm-btn:hover { color: #fa5252; }
  .row-dragging { opacity: 0.4; }
  .row-drag-over td { background: #e7f5ff !important; box-shadow: inset 0 2px 0 #228be6; }
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
  .btn-export { padding: 0.45rem 0.9rem; background: #f1f3f5; border: 1px solid #ced4da; border-radius: 6px; cursor: pointer; font-size: 0.85rem; color: #495057; }
  .btn-export:hover:not(:disabled) { background: #e9ecef; }
  .btn-export:disabled { opacity: 0.6; }

  /* Micronutrients spider chart section */
  .micro-section { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #f1f3f5; }
  .micro-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
  .micro-title { font-size: 0.85rem; font-weight: 600; color: #495057; }
  .settings-btn { background: none; border: 1px solid #ced4da; border-radius: 6px; padding: 0.25rem 0.6rem; font-size: 0.78rem; color: #495057; cursor: pointer; }
  .settings-btn:hover { background: #f1f3f5; }
  .spider-charts { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  @media (max-width: 640px) { .spider-charts { grid-template-columns: 1fr; } }
  .omega-section { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #f1f3f5; max-width: 420px; }

  /* Shopping list */
  .spesa-section { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #f1f3f5; }
  .spesa-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
  .spesa-title { font-size: 0.85rem; font-weight: 600; color: #495057; }
  .spesa-molt-label { display: flex; align-items: center; gap: 0.3rem; font-size: 0.82rem; color: #868e96; }
  .spesa-molt-input { width: 44px; padding: 0.2rem 0.35rem; border: 1px solid #ced4da; border-radius: 4px; font-size: 0.85rem; text-align: center; }
  .spesa-molt-input:focus { outline: 2px solid #228be6; border-color: transparent; }
  .spesa-molt-hint { font-size: 0.78rem; color: #adb5bd; }
  .spesa-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0; }
  .spesa-list li { display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid #f1f3f5; font-size: 0.875rem; }
  .spesa-list li:last-child { border-bottom: none; }
  .spesa-nome { color: #212529; }
  .spesa-qty { color: #868e96; font-variant-numeric: tabular-nums; }

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
