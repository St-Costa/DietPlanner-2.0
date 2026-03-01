<script lang="ts">
  import { api, ApiError } from "../api";
  import { ingredientiStore } from "../stores/ingredienti";
  import { goto } from "$app/navigation";
  import type { Ingrediente, IngredienteInput } from "../types";

  let {
    ingrediente = null,
  }: {
    ingrediente?: Ingrediente | null;
  } = $props();

  const isEdit = $derived(!!ingrediente);

  // Form fields
  let nome = $state(ingrediente?.nome ?? "");
  let tipo = $state(ingrediente?.tipo ?? "");
  let kcal = $state(ingrediente?.kcal ?? 0);
  let proteine = $state(ingrediente?.proteine ?? 0);
  let fibre = $state(ingrediente?.fibre ?? 0);
  let grassi = $state(ingrediente?.grassi ?? 0);
  let saturi = $state(ingrediente?.saturi ?? 0);
  let carboidrati = $state(ingrediente?.carboidrati ?? 0);
  let zuccheri = $state(ingrediente?.zuccheri ?? 0);
  let sodio = $state(ingrediente?.sodio ?? 0);
  let colesterolo = $state(ingrediente?.colesterolo ?? 0);
  let nome_unita = $state(ingrediente?.nome_unita ?? "");
  let peso_unita = $state(ingrediente?.peso_unita ?? 0);
  let costo = $state(ingrediente?.costo ?? 0);

  let tipiSuggeriti = $state<string[]>([]);
  let showSuggestions = $state(false);
  let error = $state<string | null>(null);
  let loading = $state(false);
  let deleteConfirm = $state(false);
  let conflictWarning = $state<{ affectedRecipes: string[]; message: string } | null>(null);

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
      nome, tipo, kcal, proteine, fibre, grassi, saturi,
      carboidrati, zuccheri, sodio, colesterolo,
      nome_unita: nome_unita.trim() || null,
      peso_unita: nome_unita.trim() ? peso_unita : null,
      costo: nome_unita.trim() ? costo : null,
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
            message: e.body.message as string,
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

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if conflictWarning}
    <div class="warning">
      <p>{conflictWarning.message}</p>
      <p>Ricette interessate: {conflictWarning.affectedRecipes.join(", ")}</p>
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
      <label>Kcal <input type="number" bind:value={kcal} min="0" step="0.1" required /></label>
      <label>Proteine (g) <input type="number" bind:value={proteine} min="0" step="0.1" required /></label>
      <label>Grassi (g) <input type="number" bind:value={grassi} min="0" step="0.1" required /></label>
      <label>— di cui saturi (g) <input type="number" bind:value={saturi} min="0" step="0.1" required /></label>
      <label>Carboidrati (g) <input type="number" bind:value={carboidrati} min="0" step="0.1" required /></label>
      <label>— di cui zuccheri (g) <input type="number" bind:value={zuccheri} min="0" step="0.1" required /></label>
      <label>Fibre (g) <input type="number" bind:value={fibre} min="0" step="0.1" required /></label>
      <label>Sodio (mg) <input type="number" bind:value={sodio} min="0" step="1" required /></label>
      <label>Colesterolo (mg) <input type="number" bind:value={colesterolo} min="0" step="1" required /></label>
    </div>
  </section>

  <section>
    <h2>Dettagli prodotto (opzionale)</h2>
    <p class="hint">Compila se vuoi inserire le quantità in unità (es. "2 uova") invece che in grammi</p>
    <div class="grid-3">
      <label>Nome unità <input bind:value={nome_unita} placeholder="es. Uovo" /></label>
      <label>Peso unità (g) <input type="number" bind:value={peso_unita} min="0" step="0.1" /></label>
      <label>Costo (€/unità) <input type="number" bind:value={costo} min="0" step="0.01" /></label>
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
</style>
