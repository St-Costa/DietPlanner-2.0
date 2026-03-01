<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { ricetteStore } from "$lib/stores/ricette";
  import { api } from "$lib/api";
  import SortableTable from "$lib/components/SortableTable.svelte";
  import type { RicettaFull } from "$lib/types";

  // Flatten nutrition for SortableTable
  type FlatRow = { id: string; nome: string; kcal: number; proteine: number; grassi: number; carboidrati: number; grammi: number };

  const columns = [
    { key: "nome", label: "Nome" },
    { key: "kcal", label: "Kcal", numeric: true, format: (v: unknown) => Number(v).toFixed(0) },
    { key: "proteine", label: "Prot (g)", numeric: true, format: (v: unknown) => Number(v).toFixed(1) },
    { key: "grassi", label: "Grassi (g)", numeric: true, format: (v: unknown) => Number(v).toFixed(1) },
    { key: "carboidrati", label: "Carbo (g)", numeric: true, format: (v: unknown) => Number(v).toFixed(1) },
    { key: "grammi", label: "Peso (g)", numeric: true, format: (v: unknown) => Number(v).toFixed(0) },
  ];

  let flatRows = $derived($ricetteStore.map((r): FlatRow => ({
    id: r.id,
    nome: r.nome,
    kcal: r.nutrizione.kcal,
    proteine: r.nutrizione.proteine,
    grassi: r.nutrizione.grassi,
    carboidrati: r.nutrizione.carboidrati,
    grammi: r.nutrizione.grammi,
  })));

  onMount(() => ricetteStore.load());

  function handleRowClick(row: FlatRow) {
    goto(`/ricette/${row.id}`);
  }

  async function handleDelete(row: FlatRow) {
    if (!window.confirm(`Eliminare la ricetta "${row.nome}"?`)) return;
    await api.ricette.delete(row.id);
    await ricetteStore.reload();
  }
</script>

<div class="header">
  <h1>Ricette</h1>
  <a href="/ricette/nuovo" class="btn-primary">+ Nuova</a>
</div>

<SortableTable columns={columns} rows={flatRows} onrowclick={handleRowClick} ondelete={handleDelete} />

<style>
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
  h1 { font-size: 1.5rem; }
  .btn-primary { padding: 0.5rem 1rem; background: #228be6; color: #fff; text-decoration: none; border-radius: 6px; font-size: 0.9rem; font-weight: 500; }
  .btn-primary:hover { background: #1c7ed6; }
</style>
