<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { api } from "$lib/api";
  import IngredienteForm from "$lib/components/IngredienteForm.svelte";
  import type { Ingrediente } from "$lib/types";

  let ingrediente = $state<Ingrediente | null>(null);
  let notFound = $state(false);

  onMount(async () => {
    try {
      ingrediente = await api.ingredienti.get($page.params.id);
    } catch {
      notFound = true;
    }
  });
</script>

{#if notFound}
  <p>Ingrediente non trovato. <a href="/ingredienti">Torna alla lista</a></p>
{:else if ingrediente}
  <IngredienteForm {ingrediente} />
{:else}
  <p>Caricamento...</p>
{/if}
