<script lang="ts">
  let {
    omega3,
    omega6,
    omega3Target,
    omega6Target,
  }: {
    omega3: number;
    omega6: number;
    omega3Target: number;
    omega6Target: number;
  } = $props();

  function fmtG(v: number): string {
    if (v === 0) return "0";
    if (v < 0.1) return v.toFixed(3);
    if (v < 10) return v.toFixed(2);
    return v.toFixed(1);
  }

  // Bar fill capped at 150% visually, but % label shows real value
  const pct3 = $derived(omega3Target > 0 ? (omega3 / omega3Target) * 100 : 0);
  const pct6 = $derived(omega6Target > 0 ? (omega6 / omega6Target) * 100 : 0);
  const fill3 = $derived(Math.min(pct3, 150));
  const fill6 = $derived(Math.min(pct6, 150));

  const ratio = $derived(omega3 > 0 ? omega6 / omega3 : null);

  function pct3Color(p: number): string {
    if (p >= 100) return "#2f9e44";
    if (p >= 50) return "#e67700";
    return "#c92a2a";
  }

  function ratioColor(r: number | null): string {
    if (r === null) return "#868e96";
    if (r <= 4) return "#2f9e44";
    if (r <= 10) return "#e67700";
    return "#c92a2a";
  }

  function ratioLabel(r: number | null): string {
    if (r === null) return "";
    if (r <= 4) return "ottimale";
    if (r <= 10) return "accettabile";
    return "elevato";
  }
</script>

<div class="omega-wrap">
  <h3 class="chart-title">Acidi grassi Omega</h3>

  <div class="bars">
    <div class="bar-row">
      <span class="bar-label">ω-3</span>
      <div class="bar-track">
        <div class="bar omega3" style="width: {fill3 / 1.5}%"></div>
        <div class="target-line"></div>
      </div>
      <span class="bar-val">{fmtG(omega3)} g</span>
      <span class="bar-pct" style="color: {pct3Color(pct3)}">{Math.round(pct3)}%</span>
    </div>
    <div class="bar-row">
      <span class="bar-label">ω-6</span>
      <div class="bar-track">
        <div class="bar omega6" style="width: {fill6 / 1.5}%"></div>
        <div class="target-line"></div>
      </div>
      <span class="bar-val">{fmtG(omega6)} g</span>
      <span class="bar-pct neutral">{Math.round(pct6)}%</span>
    </div>
  </div>

  <div class="targets-hint">obiettivo: ω-3 {omega3Target} g · ω-6 {omega6Target} g</div>

  <div class="ratio-row">
    <span class="ratio-label">Rapporto ω-6 / ω-3</span>
    <span class="ratio-val" style="color: {ratioColor(ratio)}">
      {ratio !== null ? ratio.toFixed(1) + " : 1" : "N/D"}
    </span>
    {#if ratio !== null}
      <span class="ratio-tag" style="background: {ratioColor(ratio)}20; color: {ratioColor(ratio)}">
        {ratioLabel(ratio)}
      </span>
    {/if}
  </div>
</div>

<style>
  .omega-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }
  .chart-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: #495057;
    margin: 0;
    text-align: center;
  }
  .bars {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .bar-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .bar-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #495057;
    width: 2rem;
    flex-shrink: 0;
    text-align: right;
  }
  .bar-track {
    flex: 1;
    height: 14px;
    background: #f1f3f5;
    border-radius: 7px;
    overflow: hidden;
    position: relative;
  }
  /* Target line at 66.67% of track = 100% of target (track = 150% scale) */
  .target-line {
    position: absolute;
    top: 0;
    bottom: 0;
    left: calc(100% / 1.5);
    width: 1.5px;
    background: #adb5bd;
  }
  .bar {
    height: 100%;
    border-radius: 7px;
    min-width: 2px;
    transition: width 0.3s ease;
  }
  .bar.omega3 { background: #1c7ed6; }
  .bar.omega6 { background: #f08c00; }
  .bar-val {
    font-size: 0.78rem;
    color: #495057;
    width: 3.8rem;
    flex-shrink: 0;
    text-align: right;
    white-space: nowrap;
  }
  .bar-pct {
    font-size: 0.78rem;
    font-weight: 600;
    width: 2.8rem;
    flex-shrink: 0;
    text-align: right;
    white-space: nowrap;
  }
  .bar-pct.neutral { color: #495057; }
  .targets-hint {
    font-size: 0.7rem;
    color: #adb5bd;
    text-align: right;
  }
  .ratio-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-top: 0.4rem;
    border-top: 1px solid #f1f3f5;
    font-size: 0.82rem;
  }
  .ratio-label { color: #868e96; flex: 1; }
  .ratio-val { font-weight: 700; font-size: 0.9rem; }
  .ratio-tag {
    font-size: 0.72rem;
    font-weight: 500;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
  }
</style>
