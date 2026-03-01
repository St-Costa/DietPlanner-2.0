<script lang="ts">
  let {
    proteine,
    carboidrati,
    grassi,
    showGrams = false,
  }: {
    proteine: number;
    carboidrati: number;
    grassi: number;
    showGrams?: boolean;
  } = $props();

  const r = 40;
  const C = 2 * Math.PI * r; // ≈ 251.33

  const kcalProt   = $derived(proteine    * 4);
  const kcalCarbo  = $derived(carboidrati * 4);
  const kcalGrassi = $derived(grassi      * 9);
  const total = $derived(kcalProt + kcalCarbo + kcalGrassi);

  const p1 = $derived(total > 0 ? kcalProt   / total : 0);
  const p2 = $derived(total > 0 ? kcalCarbo  / total : 0);
  const p3 = $derived(total > 0 ? kcalGrassi / total : 0);

  // Donut via stroke-dasharray; offset C*0.25 starts at 12 o'clock
  const seg1da = $derived(`${p1 * C} ${(1 - p1) * C}`);
  const seg1do = $derived(C * 0.25);

  const seg2da = $derived(`${p2 * C} ${(1 - p2) * C}`);
  const seg2do = $derived(C * (0.25 - p1));

  const seg3da = $derived(`${p3 * C} ${(1 - p3) * C}`);
  const seg3do = $derived(C * (0.25 - p1 - p2));

  function pct(p: number): string {
    return (p * 100).toFixed(0) + "%";
  }
  function g(val: number): string {
    return val.toFixed(1) + "g";
  }
</script>

<div class="chart-wrap">
  <svg viewBox="0 0 120 120" class="pie" aria-hidden="true">
    {#if total === 0}
      <circle cx="60" cy="60" r="{r}" fill="none" stroke="#dee2e6" stroke-width="20" />
    {:else}
      <!-- Proteine: green -->
      <circle cx="60" cy="60" r="{r}" fill="none" stroke="#40c057" stroke-width="20"
        stroke-dasharray={seg1da} stroke-dashoffset={seg1do} />
      <!-- Carboidrati: yellow -->
      <circle cx="60" cy="60" r="{r}" fill="none" stroke="#fcc419" stroke-width="20"
        stroke-dasharray={seg2da} stroke-dashoffset={seg2do} />
      <!-- Grassi: red -->
      <circle cx="60" cy="60" r="{r}" fill="none" stroke="#fa5252" stroke-width="20"
        stroke-dasharray={seg3da} stroke-dashoffset={seg3do} />
    {/if}
  </svg>

  <div class="legend">
    <div class="leg-item">
      <span class="dot" style="background:#40c057"></span>
      <span>Prot <strong>{pct(p1)}</strong>{#if showGrams} <span class="grams">({g(proteine)})</span>{/if}</span>
    </div>
    <div class="leg-item">
      <span class="dot" style="background:#fcc419"></span>
      <span>Carbo <strong>{pct(p2)}</strong>{#if showGrams} <span class="grams">({g(carboidrati)})</span>{/if}</span>
    </div>
    <div class="leg-item">
      <span class="dot" style="background:#fa5252"></span>
      <span>Grassi <strong>{pct(p3)}</strong>{#if showGrams} <span class="grams">({g(grassi)})</span>{/if}</span>
    </div>
  </div>
</div>

<style>
  .chart-wrap { display: flex; align-items: center; gap: 1rem; }
  .pie { width: 84px; height: 84px; flex-shrink: 0; }
  .legend { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.8rem; color: #495057; }
  .leg-item { display: flex; align-items: center; gap: 0.4rem; }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .grams { color: #868e96; }
</style>
