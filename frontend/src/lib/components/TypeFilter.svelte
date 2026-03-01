<script lang="ts">
  let {
    tipi,
    selected,
    onchange,
  }: {
    tipi: string[];
    selected: string | null;
    onchange: (tipo: string | null) => void;
  } = $props();
</script>

<div class="filters">
  <button
    class:active={selected === null}
    onclick={() => onchange(null)}
  >
    Tutti
  </button>
  {#each tipi as tipo}
    <button
      class:active={selected === tipo}
      onclick={() => onchange(selected === tipo ? null : tipo)}
    >
      {tipo}
    </button>
  {/each}
</div>

<style>
  .filters { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem; }
  button {
    padding: 0.3rem 0.75rem;
    border: 1px solid #dee2e6;
    border-radius: 20px;
    background: #fff;
    cursor: pointer;
    font-size: 0.85rem;
    color: #495057;
    transition: background 0.1s, border-color 0.1s;
  }
  button:hover { border-color: #228be6; color: #228be6; }
  button.active { background: #228be6; border-color: #228be6; color: #fff; }
</style>
