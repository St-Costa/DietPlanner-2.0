<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { ingredientiStore } from "$lib/stores/ingredienti";
  import { api } from "$lib/api";
  import SortableTable from "$lib/components/SortableTable.svelte";
  import TypeFilter from "$lib/components/TypeFilter.svelte";
  import type { Ingrediente } from "$lib/types";

  let tipi = $state<string[]>([]);
  let selectedTipo = $state<string | null>(null);

  const columns = [
    { key: "nome", label: "Nome" },
    { key: "tipo", label: "Tipo" },
    { key: "kcal", label: "Kcal", numeric: true, format: (v: unknown) => Number(v).toFixed(0) },
    { key: "proteine", label: "Proteine (g)", numeric: true, format: (v: unknown) => Number(v).toFixed(1) },
    { key: "grassi", label: "Grassi (g)", numeric: true, format: (v: unknown) => Number(v).toFixed(1) },
    { key: "carboidrati", label: "Carbo (g)", numeric: true, format: (v: unknown) => Number(v).toFixed(1) },
    { key: "fibre", label: "Fibre (g)", numeric: true, format: (v: unknown) => Number(v).toFixed(1) },
    { key: "sodio", label: "Sodio (mg)", numeric: true, format: (v: unknown) => Number(v).toFixed(0) },
  ];

  let filtered = $derived(
    selectedTipo
      ? $ingredientiStore.filter((i) => i.tipo === selectedTipo)
      : $ingredientiStore
  );

  onMount(async () => {
    await ingredientiStore.load();
    tipi = await api.ingredienti.tipi();
  });

  function handleRowClick(row: Ingrediente) {
    goto(`/ingredienti/${row.id}`);
  }

  async function handleDelete(row: Ingrediente) {
    if (!window.confirm(`Eliminare "${row.nome}"?`)) return;
    await api.ingredienti.delete(row.id);
    await ingredientiStore.reload();
  }
</script>

<div class="header">
  <h1>Ingredienti</h1>
  <a href="/ingredienti/nuovo" class="btn-primary">+ Nuovo</a>
</div>

<TypeFilter {tipi} selected={selectedTipo} onchange={(t) => (selectedTipo = t)} />

<SortableTable columns={columns} rows={filtered} onrowclick={handleRowClick} ondelete={handleDelete} />

<style>
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
  h1 { font-size: 1.5rem; }
  .btn-primary {
    padding: 0.5rem 1rem;
    background: #228be6;
    color: #fff;
    text-decoration: none;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
  }
  .btn-primary:hover { background: #1c7ed6; }
</style>
