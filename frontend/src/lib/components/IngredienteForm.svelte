<script lang="ts">
  import { api, ApiError } from "../api";
  import { ingredientiStore } from "../stores/ingredienti";
  import { goto } from "$app/navigation";
  import type { Ingrediente, IngredienteInput, ScrapeResult } from "../types";

  let {
    ingrediente = null,
  }: {
    ingrediente?: Ingrediente | null;
  } = $props();

  const isEdit = $derived(!!ingrediente);

  // Numeric fields stored as strings to accept both "," and "." as decimal separator.
  // parseNum() normalizes before sending to the server.
  function parseNum(s: string): number {
    const n = parseFloat(s.trim().replace(",", "."));
    return isNaN(n) ? 0 : n;
  }
  function numStr(n: number | null | undefined): string {
    return n != null ? String(n) : "";
  }

  // Form fields
  let nome = $state(ingrediente?.nome ?? "");
  let tipo = $state(ingrediente?.tipo ?? "");
  let kcal = $state(numStr(ingrediente?.kcal ?? 0));
  let proteine = $state(numStr(ingrediente?.proteine ?? 0));
  let fibre = $state(numStr(ingrediente?.fibre ?? 0));
  let grassi = $state(numStr(ingrediente?.grassi ?? 0));
  let saturi = $state(numStr(ingrediente?.saturi ?? 0));
  let carboidrati = $state(numStr(ingrediente?.carboidrati ?? 0));
  let zuccheri = $state(numStr(ingrediente?.zuccheri ?? 0));
  let sodio = $state(numStr(ingrediente?.sodio ?? 0));
  let colesterolo = $state(numStr(ingrediente?.colesterolo ?? 0));
  let nome_unita = $state(ingrediente?.nome_unita ?? "");
  let peso_unita = $state(numStr(ingrediente?.peso_unita));
  let costo = $state(numStr(ingrediente?.costo));

  let extra_nutrienti = $state<Record<string, { valore: number; unita: string }>>(
    ingrediente?.extra_nutrienti ?? {}
  );

  let tipiSuggeriti = $state<string[]>([]);
  let showSuggestions = $state(false);
  let error = $state<string | null>(null);
  let loading = $state(false);
  let deleteConfirm = $state(false);
  let conflictWarning = $state<{ affectedRecipes: string[] } | null>(null);

  // Import from nutritionvalue.org
  let importUrl = $state("");
  let importLoading = $state(false);
  let importError = $state<string | null>(null);
  let importSuccess = $state(false);

  async function handleImport() {
    importError = null;
    importSuccess = false;
    importLoading = true;
    try {
      const result: ScrapeResult = await api.scrapeIngrediente(importUrl.trim());
      nome = result.nome;
      kcal = String(result.kcal);
      proteine = String(result.proteine);
      grassi = String(result.grassi);
      saturi = String(result.saturi);
      carboidrati = String(result.carboidrati);
      zuccheri = String(result.zuccheri);
      fibre = String(result.fibre);
      sodio = String(result.sodio);
      colesterolo = String(result.colesterolo);
      extra_nutrienti = result.extra_nutrienti;
      importSuccess = true;
    } catch (e) {
      if (e instanceof ApiError) {
        importError = String(e.body.error ?? e.message);
      } else {
        importError = "Errore di rete o URL non raggiungibile";
      }
    } finally {
      importLoading = false;
    }
  }

  async function fetchTipi() {
    try {
      const all = await api.ingredienti.tipi();
      tipiSuggeriti = all.filter((t) => t.toLowerCase().includes(tipo.toLowerCase()) && t !== tipo);
      showSuggestions = tipiSuggeriti.length > 0;
    } catch {}
  }

  function selectTipo(t: string) {
    tipo = t;
    showSuggestions = false;
  }

  function buildInput(): IngredienteInput {
    return {
      nome, tipo,
      kcal: parseNum(kcal),
      proteine: parseNum(proteine),
      fibre: parseNum(fibre),
      grassi: parseNum(grassi),
      saturi: parseNum(saturi),
      carboidrati: parseNum(carboidrati),
      zuccheri: parseNum(zuccheri),
      sodio: parseNum(sodio),
      colesterolo: parseNum(colesterolo),
      nome_unita: nome_unita.trim() || null,
      peso_unita: nome_unita.trim() ? parseNum(peso_unita) : null,
      costo: nome_unita.trim() ? parseNum(costo) : null,
      extra_nutrienti: Object.keys(extra_nutrienti).length > 0 ? extra_nutrienti : undefined,
    };
  }

  async function handleSubmit() {
    error = null;
    conflictWarning = null;
    loading = true;
    try {
      const input = buildInput();
      if (isEdit && ingrediente) {
        await api.ingredienti.update(ingrediente.id, input);
      } else {
        await api.ingredienti.create(input);
      }
      await ingredientiStore.reload();
      goto("/ingredienti");
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 409 && e.body.warning === "unitToggleAffects") {
          conflictWarning = {
            affectedRecipes: e.body.affectedRecipes as string[],
          };
        } else {
          error = String(e.body.error ?? e.message);
        }
      } else {
        error = "Errore di rete";
      }
    } finally {
      loading = false;
    }
  }

  async function forceUpdate() {
    error = null;
    conflictWarning = null;
    loading = true;
    try {
      if (ingrediente) {
        await api.ingredienti.update(ingrediente.id, buildInput(), true);
        await ingredientiStore.reload();
        goto("/ingredienti");
      }
    } catch (e) {
      error = e instanceof ApiError ? String(e.body.error) : "Errore";
    } finally {
      loading = false;
    }
  }

  async function handleDelete() {
    if (!deleteConfirm || !ingrediente) return;
    loading = true;
    try {
      await api.ingredienti.delete(ingrediente.id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        error = `Usato in: ${(e.body.usedIn as string[]).join(", ")}`;
        // Force delete with confirmation
        const ok = confirm(`Questo ingrediente è usato nelle ricette: ${(e.body.usedIn as string[]).join(", ")}.\nEliminare comunque?`);
        if (ok) {
          await api.ingredienti.delete(ingrediente.id, true);
        } else {
          loading = false;
          deleteConfirm = false;
          return;
        }
      } else {
        error = "Errore durante eliminazione";
        loading = false;
        return;
      }
    }
    await ingredientiStore.reload();
    goto("/ingredienti");
  }
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
  <h1>{isEdit ? "Modifica Ingrediente" : "Nuovo Ingrediente"}</h1>

  <section class="import-section">
    <h2>Importa da <a href="https://www.nutritionvalue.org/" target="_blank" rel="noopener noreferrer">nutritionvalue.org</a></h2>
    <p class="hint">Incolla l'URL di una pagina nutritionvalue.org per compilare automaticamente i valori nutrizionali</p>
    <div class="import-row">
      <input
        class="import-url"
        type="url"
        bind:value={importUrl}
        placeholder="https://www.nutritionvalue.org/Banana%2C_raw_63107010_nutritional_value.html"
        disabled={importLoading}
      />
      <button
        type="button"
        class="btn-import"
        onclick={handleImport}
        disabled={importLoading || !importUrl.trim()}
      >
        {importLoading ? "Caricamento..." : "Carica"}
      </button>
    </div>
    {#if importError}
      <div class="import-error">{importError}</div>
    {/if}
    {#if importSuccess}
      <div class="import-ok">
        Dati importati. Verifica e modifica i campi prima di salvare.
        {#if Object.keys(extra_nutrienti).length > 0}
          <br><span class="import-extra">{Object.keys(extra_nutrienti).length} valori extra salvati (vitamine, minerali, ecc.)</span>
        {/if}
      </div>
    {/if}
  </section>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if conflictWarning}
    <div class="warning">
      <p>Questo ingrediente è usato nelle seguenti ricette: <strong>{conflictWarning.affectedRecipes.join(", ")}</strong>.</p>
      <p>Le quantità nelle ricette rimarranno in grammi; la lista della spesa le convertirà automaticamente in unità.</p>
      <div class="warning-actions">
        <button type="button" onclick={forceUpdate} class="btn-danger">Procedi comunque</button>
        <button type="button" onclick={() => (conflictWarning = null)}>Annulla</button>
      </div>
    </div>
  {/if}

  <section>
    <h2>Informazioni base</h2>
    <div class="row">
      <label>
        Nome *
        <input bind:value={nome} required placeholder="es. Uovo" />
      </label>
      <label class="tipo-wrap">
        Tipo *
        <input
          bind:value={tipo}
          oninput={fetchTipi}
          onfocus={fetchTipi}
          onblur={() => setTimeout(() => (showSuggestions = false), 150)}
          required
          placeholder="es. Latticini e uova"
          autocomplete="off"
        />
        {#if showSuggestions}
          <ul class="suggestions">
            {#each tipiSuggeriti as t}
              <li><button type="button" onmousedown={() => selectTipo(t)}>{t}</button></li>
            {/each}
          </ul>
        {/if}
      </label>
    </div>
  </section>

  <section>
    <h2>Valori nutrizionali (per 100 g)</h2>
    <div class="grid-2">
      <label>Kcal <input type="text" inputmode="decimal" bind:value={kcal} required placeholder="0" /></label>
      <label>Proteine (g) <input type="text" inputmode="decimal" bind:value={proteine} required placeholder="0" /></label>
      <label>Grassi (g) <input type="text" inputmode="decimal" bind:value={grassi} required placeholder="0" /></label>
      <label>— di cui saturi (g) <input type="text" inputmode="decimal" bind:value={saturi} required placeholder="0" /></label>
      <label>Carboidrati (g) <input type="text" inputmode="decimal" bind:value={carboidrati} required placeholder="0" /></label>
      <label>— di cui zuccheri (g) <input type="text" inputmode="decimal" bind:value={zuccheri} required placeholder="0" /></label>
      <label>Fibre (g) <input type="text" inputmode="decimal" bind:value={fibre} required placeholder="0" /></label>
      <label>Sodio (mg) <input type="text" inputmode="decimal" bind:value={sodio} required placeholder="0" /></label>
      <label>Colesterolo (mg) <input type="text" inputmode="decimal" bind:value={colesterolo} required placeholder="0" /></label>
    </div>
  </section>

  <section>
    <h2>Dettagli prodotto (opzionale)</h2>
    <p class="hint">Compila se vuoi inserire le quantità in unità (es. "2 uova") invece che in grammi</p>
    <div class="grid-3">
      <label>Nome unità <input bind:value={nome_unita} placeholder="es. Uovo" /></label>
      <label>Peso unità (g) <input type="text" inputmode="decimal" bind:value={peso_unita} placeholder="0" /></label>
      <label>Costo (€/unità) <input type="text" inputmode="decimal" bind:value={costo} placeholder="0" /></label>
    </div>
  </section>

  <div class="actions">
    <button type="submit" class="btn-primary" disabled={loading}>
      {loading ? "Salvataggio..." : isEdit ? "Salva modifiche" : "Crea ingrediente"}
    </button>
    <a href="/ingredienti" class="btn-secondary">Annulla</a>

    {#if isEdit}
      {#if deleteConfirm}
        <button type="button" class="btn-danger" onclick={handleDelete} disabled={loading}>
          Conferma eliminazione
        </button>
        <button type="button" onclick={() => (deleteConfirm = false)}>Annulla</button>
      {:else}
        <button type="button" class="btn-ghost-danger" onclick={() => (deleteConfirm = true)}>
          Elimina
        </button>
      {/if}
    {/if}
  </div>
</form>

<style>
  h1 { margin-bottom: 1.5rem; font-size: 1.5rem; }
  h2 { font-size: 1rem; margin-bottom: 0.75rem; color: #495057; }
  section { margin-bottom: 1.5rem; padding: 1rem; background: #fff; border: 1px solid #dee2e6; border-radius: 8px; }
  .hint { font-size: 0.85rem; color: #868e96; margin-bottom: 0.75rem; }
  label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; font-weight: 500; }
  input[type=text], input[type=number], input:not([type]) {
    padding: 0.45rem 0.6rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  input:focus { outline: 2px solid #228be6; border-color: transparent; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .grid-2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.75rem; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
  .tipo-wrap { position: relative; }
  .suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #fff;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    list-style: none;
    z-index: 10;
    max-height: 200px;
    overflow-y: auto;
  }
  .suggestions li button {
    width: 100%;
    text-align: left;
    padding: 0.4rem 0.6rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
  }
  .suggestions li button:hover { background: #e7f5ff; }
  .actions { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-top: 1rem; }
  .btn-primary {
    padding: 0.5rem 1.25rem;
    background: #228be6;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
  }
  .btn-primary:hover:not(:disabled) { background: #1c7ed6; }
  .btn-primary:disabled { opacity: 0.6; }
  .btn-secondary {
    padding: 0.5rem 1rem;
    border: 1px solid #ced4da;
    border-radius: 6px;
    text-decoration: none;
    color: #495057;
    font-size: 0.9rem;
  }
  .btn-secondary:hover { background: #f1f3f5; }
  .btn-ghost-danger { background: none; border: none; color: #fa5252; cursor: pointer; margin-left: auto; font-size: 0.85rem; }
  .btn-ghost-danger:hover { text-decoration: underline; }
  .btn-danger { padding: 0.5rem 1rem; background: #fa5252; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
  .error { padding: 0.75rem; background: #fff5f5; border: 1px solid #ff8787; border-radius: 6px; color: #c92a2a; margin-bottom: 1rem; }
  .warning { padding: 0.75rem; background: #fff9db; border: 1px solid #ffd43b; border-radius: 6px; margin-bottom: 1rem; }
  .warning p { margin-bottom: 0.5rem; font-size: 0.9rem; }
  .warning-actions { display: flex; gap: 0.5rem; }
  .import-section { border-color: #a5d8ff; background: #f0f8ff; }
  .import-row { display: flex; gap: 0.5rem; align-items: stretch; }
  .import-url { flex: 1; padding: 0.45rem 0.6rem; border: 1px solid #ced4da; border-radius: 4px; font-size: 0.85rem; }
  .import-url:focus { outline: 2px solid #228be6; border-color: transparent; }
  .btn-import {
    padding: 0.45rem 1rem;
    background: #228be6;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    white-space: nowrap;
  }
  .btn-import:hover:not(:disabled) { background: #1c7ed6; }
  .btn-import:disabled { opacity: 0.6; cursor: default; }
  .import-error { margin-top: 0.5rem; font-size: 0.85rem; color: #c92a2a; }
  .import-ok { margin-top: 0.5rem; font-size: 0.85rem; color: #2b8a3e; }
  .import-extra { color: #495057; }
</style>
