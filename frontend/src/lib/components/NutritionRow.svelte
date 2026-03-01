<script lang="ts">
  import type { NutritionTotals } from "../types";
  import { fmt } from "../utils/nutrition";

  let {
    label,
    nutrition,
    isTotal = false,
  }: {
    label: string;
    nutrition: NutritionTotals;
    isTotal?: boolean;
  } = $props();
</script>

<tr class:total={isTotal}>
  <td class="label">{label}</td>
  <td class="num">{fmt(nutrition.grammi)}</td>
  <td class="num">{fmt(nutrition.kcal)}</td>
  <td class="num">{fmt(nutrition.proteine)}</td>
  <td class="num">{fmt(nutrition.grassi)}</td>
  <td class="num">{fmt(nutrition.saturi)}</td>
  <td class="num">{fmt(nutrition.carboidrati)}</td>
  <td class="num">{fmt(nutrition.zuccheri)}</td>
  <td class="num">{fmt(nutrition.fibre)}</td>
  <td class="num">{fmt(nutrition.sodio, 0)}</td>
  <td class="num">{fmt(nutrition.colesterolo, 0)}</td>
</tr>

<style>
  td { padding: 0.4rem 0.6rem; border-bottom: 1px solid #f1f3f5; font-size: 0.85rem; white-space: nowrap; }
  td.num { text-align: right; }
  td.label { font-weight: 500; }
  tr.total td { font-weight: 700; background: #f8f9fa; border-top: 2px solid #dee2e6; border-bottom: none; }
</style>
