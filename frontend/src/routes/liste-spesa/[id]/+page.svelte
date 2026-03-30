<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { api } from "$lib/api";
  import type { ListaSpesa } from "$lib/types";

  let lista = $state<ListaSpesa | null>(null);
  let errore = $state<string | null>(null);
  let checked = $state<Set<string>>(new Set());
  let dispensa = $state<Record<string, number>>({});

  onMount(async () => {
    try {
      lista = await api.listeSpesa.get(page.params.id!);
    } catch {
      errore = "Lista non trovata.";
    }
  });

  function toggleCheck(ingredienteId: string) {
    const next = new Set(checked);
    if (next.has(ingredienteId)) next.delete(ingredienteId);
    else next.add(ingredienteId);
    checked = next;
  }

  function setDispensa(ingredienteId: string, val: number) {
    dispensa = { ...dispensa, [ingredienteId]: val };
  }

  function qtaDisplay(item: { totaleGrammi: number; totaleUnita: number | null; nome_unita: string | null; peso_unita: number | null }, dispensaVal: number): string {
    if (item.totaleUnita !== null && item.nome_unita) {
      const remaining = Math.max(0, item.totaleUnita - dispensaVal);
      return `${Math.round(remaining * 100) / 100} ${item.nome_unita}`;
    }
    const remaining = Math.max(0, item.totaleGrammi - dispensaVal);
    return `${Math.round(remaining * 100) / 100} g`;
  }

  async function handleDelete() {
    if (!lista) return;
    const ok = window.confirm(`Eliminare "${lista.nome}"?`);
    if (!ok) return;
    await api.listeSpesa.delete(lista.id);
    goto("/liste-spesa");
  }
</script>

{#if errore}
  <p class="error">{errore}</p>
  <a href="/liste-spesa">&larr; Torna alle liste</a>
{:else if lista}
  <div class="header">
    <div>
      <a href="/liste-spesa" class="back">&larr; Liste Spesa</a>
      <h1>{lista.nome}</h1>
      <p class="meta">Creata il {new Date(lista.created_at).toLocaleDateString("it-IT", { dateStyle: "long" })}</p>
    </div>
    <button class="delete-btn" title="Elimina lista" onclick={handleDelete}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
        <path d="M10 11v6"></path><path d="M14 11v6"></path>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
      </svg>
    </button>
  </div>

  <ul class="items">
    {#each lista.items as item}
      {@const dispensaVal = dispensa[item.ingredienteId] ?? 0}
      <li class="item" class:checked={checked.has(item.ingredienteId)}>
        <label class="item-main">
          <input
            type="checkbox"
            checked={checked.has(item.ingredienteId)}
            onchange={() => toggleCheck(item.ingredienteId)}
          />
          <span class="nome">{item.nome}</span>
          <span class="qta">{qtaDisplay(item, dispensaVal)}</span>
          {#if item.costoTotale !== null}
            <span class="costo">&euro;{item.costoTotale.toFixed(2)}</span>
          {/if}
        </label>
        <div class="dispensa">
          <label class="dispensa-label">
            Ho già:
            <input
              type="number"
              min="0"
              step="0.5"
              class="dispensa-input"
              value={dispensaVal || ""}
              oninput={(e) => setDispensa(item.ingredienteId, parseFloat((e.target as HTMLInputElement).value) || 0)}
            />
            <span class="dispensa-unit">{item.nome_unita ?? "g"}</span>
          </label>
        </div>
      </li>
    {/each}
  </ul>

  {#if lista.costoTotale !== null}
    <p class="totale-costo">Costo stimato: &euro;{lista.costoTotale.toFixed(2)}</p>
  {/if}

  {#if lista.ricette.length > 0}
    <hr class="sezione-sep" />
    <h2 class="ricette-title">Ricette</h2>
    {#each lista.ricette as r}
      <section class="ricetta">
        <h3>{r.nome}</h3>
        <table class="ing-table">
          <thead><tr><th>Ingrediente</th><th>Quantità</th></tr></thead>
          <tbody>
            {#each r.ingredienti as i}
              <tr><td>{i.nome}</td><td>{i.quantita} {i.unita}</td></tr>
            {/each}
          </tbody>
        </table>
        {#if r.preparazione.trim()}
          <h4>Preparazione</h4>
          <pre class="preparazione">{r.preparazione.trim()}</pre>
        {/if}
      </section>
    {/each}
  {/if}
{:else}
  <p>Caricamento...</p>
{/if}

<style>
  .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.5rem; }
  .back { color: #868e96; text-decoration: none; font-size: 0.85rem; }
  .back:hover { color: #228be6; }
  h1 { font-size: 1.5rem; margin-top: 0.25rem; }
  .meta { color: #868e96; font-size: 0.85rem; }
  .delete-btn { background: none; border: 1px solid #dee2e6; border-radius: 6px; cursor: pointer; color: #fa5252; padding: 0.45rem 0.55rem; display: inline-flex; align-items: center; opacity: 0.7; margin-top: 0.25rem; }
  .delete-btn:hover { opacity: 1; background: #fff5f5; border-color: #ffa8a8; }

  .items { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; max-width: 700px; }
  .item {
    padding: 0.75rem 1rem;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    background: #fff;
  }
  .item.checked { opacity: 0.5; }
  .item-main { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; }
  .item-main input[type=checkbox] { width: 1.1rem; height: 1.1rem; flex-shrink: 0; }
  .nome { font-weight: 500; flex: 1; }
  .checked .nome { text-decoration: line-through; color: #868e96; }
  .qta { color: #495057; font-size: 0.9rem; }
  .costo { font-size: 0.85rem; color: #495057; min-width: 4rem; text-align: right; }

  .dispensa { margin-top: 0.5rem; padding-left: 1.85rem; }
  .dispensa-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #868e96; }
  .dispensa-input { width: 4rem; padding: 0.2rem 0.4rem; border: 1px solid #dee2e6; border-radius: 4px; }

  .totale-costo { margin-top: 1rem; text-align: right; font-weight: 600; max-width: 700px; }

  .sezione-sep { margin: 2.5rem 0; border: none; border-top: 2px solid #dee2e6; max-width: 700px; }
  .ricette-title { font-size: 1.25rem; margin-bottom: 1rem; }
  .ricetta { margin-bottom: 2rem; max-width: 700px; }
  h3 { font-size: 1.1rem; margin-bottom: 0.5rem; }
  h4 { font-size: 0.95rem; color: #495057; margin: 0.75rem 0 0.35rem; }
  .ing-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  .ing-table th, .ing-table td { text-align: left; padding: 0.35rem 0.6rem; border: 1px solid #dee2e6; }
  .ing-table th { background: #f8f9fa; font-weight: 600; }
  .preparazione { white-space: pre-wrap; font-family: inherit; font-size: 0.9rem; line-height: 1.6; background: #f8f9fa; padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid #dee2e6; }

  .error { color: #c92a2a; }
</style>
