<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { api } from "$lib/api";
  import GiornataForm from "$lib/components/GiornataForm.svelte";
  import type { GiornataFull } from "$lib/types";

  let giornata = $state<GiornataFull | null>(null);
  let notFound = $state(false);

  onMount(async () => {
    try {
      giornata = await api.giornate.get($page.params.id);
    } catch {
      notFound = true;
    }
  });
</script>

{#if notFound}
  <p>Giornata non trovata. <a href="/giornate">Torna alla lista</a></p>
{:else if giornata}
  <GiornataForm {giornata} />
{:else}
  <p>Caricamento...</p>
{/if}
