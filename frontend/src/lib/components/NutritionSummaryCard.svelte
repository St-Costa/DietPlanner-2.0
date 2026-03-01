<script lang="ts">
  import { fmt } from "../utils/nutrition";
  import MacroPieChart from "./MacroPieChart.svelte";
  import type { NutritionTotals } from "../types";

  let {
    totale,
    label = "Totale giornata",
  }: {
    totale: NutritionTotals;
    label?: string;
  } = $props();
</script>

<div class="summary">
  <div class="summary-label">{label}</div>
  <div class="summary-body">
    <div class="grid">
      <div class="stat main"><span class="val">{fmt(totale.kcal, 0)}</span><span class="unit">kcal</span></div>
      <div class="stat"><span class="val">{fmt(totale.grammi, 0)}</span><span class="unit">g peso</span></div>
      <div class="stat"><span class="val">{fmt(totale.proteine)}</span><span class="unit">g prot</span></div>
      <div class="stat"><span class="val">{fmt(totale.grassi)}</span><span class="unit">g grassi</span></div>
      <div class="stat"><span class="val">{fmt(totale.saturi)}</span><span class="unit">g saturi</span></div>
      <div class="stat"><span class="val">{fmt(totale.carboidrati)}</span><span class="unit">g carbo</span></div>
      <div class="stat"><span class="val">{fmt(totale.zuccheri)}</span><span class="unit">g zuccheri</span></div>
      <div class="stat"><span class="val">{fmt(totale.fibre)}</span><span class="unit">g fibre</span></div>
      <div class="stat"><span class="val">{fmt(totale.sodio, 0)}</span><span class="unit">mg sodio</span></div>
      <div class="stat"><span class="val">{fmt(totale.colesterolo, 0)}</span><span class="unit">mg colest.</span></div>
    </div>
    <MacroPieChart
      proteine={totale.proteine}
      carboidrati={totale.carboidrati}
      grassi={totale.grassi}
      showGrams={true}
    />
  </div>
</div>

<style>
  .summary {
    padding: 1rem;
    background: #e7f5ff;
    border: 1px solid #74c0fc;
    border-radius: 8px;
  }
  .summary-label { font-weight: 700; font-size: 0.85rem; text-transform: uppercase; color: #1c7ed6; margin-bottom: 0.75rem; }
  .summary-body { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
  .grid { display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem; flex: 1; }
  .stat { display: flex; flex-direction: column; align-items: center; }
  .val { font-size: 1.1rem; font-weight: 700; color: #1971c2; }
  .stat.main .val { font-size: 1.4rem; }
  .unit { font-size: 0.75rem; color: #495057; }
</style>
