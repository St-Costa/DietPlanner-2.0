<script lang="ts">
  export interface SpiderEntry {
    label: string;
    labelFull: string;
    valore: number;
    target: number;
    unita: string;
  }

  let {
    entries,
    title,
  }: {
    entries: SpiderEntry[];
    title: string;
  } = $props();

  const CX = 150;
  const CY = 125;
  const R = 88;
  const GRIDS = [0.25, 0.5, 0.75, 1.0];

  function angle(i: number, n: number): number {
    return (2 * Math.PI * i) / n - Math.PI / 2;
  }

  function pt(radius: number, i: number, n: number): { x: number; y: number } {
    const a = angle(i, n);
    return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
  }

  function polygonPoints(radius: number, n: number): string {
    return Array.from({ length: n }, (_, i) => {
      const { x, y } = pt(radius, i, n);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }

  function actualPolygonPoints(n: number): string {
    return entries
      .map((e, i) => {
        const ratio = e.target > 0 ? Math.min(e.valore / e.target, 1.5) : 0;
        const { x, y } = pt(R * ratio, i, n);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  function fmtVal(v: number): string {
    if (v === 0) return "0";
    if (v < 0.1) return v.toFixed(3);
    if (v < 10) return v.toFixed(2);
    return v.toFixed(1);
  }

  function textAnchor(x: number): "start" | "end" | "middle" {
    if (x < CX - 5) return "end";
    if (x > CX + 5) return "start";
    return "middle";
  }
</script>

<div class="spider-wrap">
  <h3 class="chart-title">{title}</h3>
  {#if entries.length >= 3}
    {@const n = entries.length}
    <svg viewBox="0 0 300 255" class="spider-svg" role="img" aria-label={title}>
      <!-- Grid polygons -->
      {#each GRIDS as f}
        <polygon
          points={polygonPoints(R * f, n)}
          fill="none"
          stroke={f === 1 ? "#adb5bd" : "#e9ecef"}
          stroke-width={f === 1 ? 1.2 : 0.7}
        />
      {/each}

      <!-- Axis lines -->
      {#each { length: n } as _, i}
        {@const p = pt(R, i, n)}
        <line x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="#e9ecef" stroke-width="0.7" />
      {/each}

      <!-- Actual polygon -->
      <polygon
        points={actualPolygonPoints(n)}
        fill="rgba(34,139,230,0.15)"
        stroke="#228be6"
        stroke-width="1.5"
        stroke-linejoin="round"
      />

      <!-- Dots at actual values -->
      {#each entries as e, i}
        {@const ratio = e.target > 0 ? Math.min(e.valore / e.target, 1.5) : 0}
        {@const p = pt(R * ratio, i, n)}
        <circle cx={p.x} cy={p.y} r="2.5" fill="#228be6" />
      {/each}

      <!-- Axis labels (short label) -->
      {#each entries as e, i}
        {@const p = pt(R + 16, i, n)}
        {@const pct = e.target > 0 ? Math.round((e.valore / e.target) * 100) : 0}
        <text
          x={p.x}
          y={p.y}
          text-anchor={textAnchor(p.x)}
          dominant-baseline="middle"
          font-size="9"
          fill={pct >= 100 ? "#2f9e44" : "#495057"}
          font-weight={pct >= 100 ? "600" : "400"}
        >{e.label}</text>
      {/each}

      <!-- Grid percentage labels along top axis -->
      {#each GRIDS as f}
        <text
          x={CX + 3}
          y={CY - R * f}
          text-anchor="start"
          dominant-baseline="middle"
          font-size="7"
          fill="#adb5bd"
        >{Math.round(f * 100)}%</text>
      {/each}
    </svg>

    <div class="legend">
      {#each entries as e}
        {@const pct = e.target > 0 ? Math.round((e.valore / e.target) * 100) : 0}
        <div class="legend-row">
          <span class="legend-name">{e.labelFull}</span>
          <span class="legend-val">{fmtVal(e.valore)} {e.unita}</span>
          <span class="legend-pct" class:ok={pct >= 100} class:low={pct < 30}>{pct}%</span>
        </div>
      {/each}
    </div>
  {:else}
    <p class="no-data">Aggiungi ingredienti per visualizzare il grafico.</p>
  {/if}
</div>

<style>
  .spider-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
  }
  .chart-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: #495057;
    margin: 0;
    text-align: center;
  }
  .spider-svg {
    width: 100%;
    height: auto;
    max-width: 300px;
    margin: 0 auto;
    display: block;
  }
  .legend {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.15rem 1rem;
    font-size: 0.72rem;
  }
  .legend-row {
    display: flex;
    gap: 0.3rem;
    align-items: baseline;
  }
  .legend-name {
    flex: 1;
    color: #495057;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .legend-val {
    color: #868e96;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .legend-pct {
    font-weight: 500;
    white-space: nowrap;
    flex-shrink: 0;
    color: #495057;
    min-width: 2.5rem;
    text-align: right;
  }
  .legend-pct.ok {
    color: #2f9e44;
  }
  .legend-pct.low {
    color: #e67700;
  }
  .no-data {
    font-size: 0.85rem;
    color: #868e96;
    text-align: center;
  }
</style>
