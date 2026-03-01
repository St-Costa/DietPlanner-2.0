<script lang="ts">
  import type { Ingrediente } from "../types";

  let {
    ingredienti,
    onselect,
  }: {
    ingredienti: Ingrediente[];
    onselect: (ing: Ingrediente) => void;
  } = $props();

  let query = $state("");
  let showDropdown = $state(false);

  let filtered = $derived(
    query.trim().length === 0
      ? ingredienti
      : ingredienti.filter((i) =>
          i.nome.toLowerCase().includes(query.toLowerCase()) ||
          i.tipo.toLowerCase().includes(query.toLowerCase())
        )
  );

  function pick(ing: Ingrediente) {
    onselect(ing);
    query = "";
    showDropdown = false;
  }
</script>

<div class="picker">
  <input
    type="text"
    bind:value={query}
    onfocus={() => (showDropdown = true)}
    onblur={() => setTimeout(() => (showDropdown = false), 150)}
    placeholder="Cerca ingrediente..."
    autocomplete="off"
  />
  {#if showDropdown && filtered.length > 0}
    <ul class="dropdown">
      {#each filtered.slice(0, 20) as ing}
        <li>
          <button type="button" onmousedown={() => pick(ing)}>
            <span class="ing-nome">{ing.nome}</span>
            <span class="ing-tipo">{ing.tipo}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .picker { position: relative; }
  input {
    width: 100%;
    padding: 0.45rem 0.6rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  input:focus { outline: 2px solid #228be6; border-color: transparent; }
  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #fff;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    list-style: none;
    z-index: 20;
    max-height: 240px;
    overflow-y: auto;
    box-shadow: 0 4px 12px rgba(0,0,0,.1);
  }
  .dropdown li button {
    width: 100%;
    text-align: left;
    padding: 0.45rem 0.75rem;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  .dropdown li button:hover { background: #e7f5ff; }
  .ing-nome { font-weight: 500; }
  .ing-tipo { font-size: 0.8rem; color: #868e96; }
</style>
