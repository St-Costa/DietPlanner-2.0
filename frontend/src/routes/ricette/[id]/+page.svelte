<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { api } from "$lib/api";
  import RicettaForm from "$lib/components/RicettaForm.svelte";
  import type { RicettaFull } from "$lib/types";

  let ricetta = $state<RicettaFull | null>(null);
  let notFound = $state(false);

  onMount(async () => {
    try {
      ricetta = await api.ricette.get($page.params.id);
    } catch {
      notFound = true;
    }
  });
</script>

{#if notFound}
  <p>Ricetta non trovata. <a href="/ricette">Torna alla lista</a></p>
{:else if ricetta}
  <RicettaForm {ricetta} />
{:else}
  <p>Caricamento...</p>
{/if}
