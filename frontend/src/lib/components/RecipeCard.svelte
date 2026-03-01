<script lang="ts">
  import { fmt } from "../utils/nutrition";
  import type { GiornataRicettaDettaglio } from "../types";

  let {
    ricetta,
    onremove,
  }: {
    ricetta: GiornataRicettaDettaglio;
    onremove?: () => void;
  } = $props();

  const n = $derived(ricetta.nutrizione);
</script>

<div class="card">
  <div class="card-header">
    <span class="nome">{ricetta.nome}</span>
    {#if onremove}
      <button type="button" class="rm-btn" onclick={onremove} title="Rimuovi">✕</button>
    {/if}
  </div>
  <div class="stats">
    <span><strong>{fmt(n.kcal, 0)}</strong> kcal</span>
    <span><strong>{fmt(n.proteine)}</strong> g prot</span>
    <span><strong>{fmt(n.grassi)}</strong> g grassi</span>
    <span><strong>{fmt(n.carboidrati)}</strong> g carbo</span>
  </div>
</div>

<style>
  .card {
    padding: 0.75rem 1rem;
    background: #fff;
    border: 1px solid #dee2e6;
    border-radius: 8px;
  }
  .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem; }
  .nome { font-weight: 600; font-size: 0.95rem; }
  .rm-btn { background: none; border: none; cursor: pointer; color: #adb5bd; font-size: 0.85rem; padding: 0.1rem 0.3rem; }
  .rm-btn:hover { color: #fa5252; }
  .stats { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.82rem; color: #495057; }
</style>
