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
  <td></td>
  <td class="num">{fmt(nutrition.kcal, 0)}</td>
  <td class="num">{fmt(nutrition.proteine)}</td>
  <td class="num">{fmt(nutrition.grassi)} <span class="sub">({fmt(nutrition.saturi)})</span></td>
  <td class="num">{fmt(nutrition.carboidrati)} <span class="sub">({fmt(nutrition.zuccheri)})</span></td>
  <td class="num">{fmt(nutrition.fibre)}</td>
  <td class="num">{fmt(nutrition.sodio, 0)}</td>
  <td class="num">{fmt(nutrition.colesterolo, 0)}</td>
  <td></td>
</tr>

<style>
  td { padding: 0.4rem 0.6rem; border-bottom: 1px solid #f1f3f5; font-size: 0.85rem; white-space: nowrap; text-align: center; vertical-align: middle; }
  td.num { text-align: center; }
  td.label { font-weight: 500; text-align: left; }
  .sub { color: #868e96; font-size: 0.8em; }
  tr.total td { font-weight: 700; background: #f8f9fa; border-top: 2px solid #dee2e6; border-bottom: none; }
</style>
