<script lang="ts">
  import { wsStatus } from "$lib/ws";
  let { children } = $props();

  const statusColor = $derived(
    $wsStatus === "connected" ? "#40c057" :
    $wsStatus === "connecting" ? "#fd7e14" : "#fa5252"
  );
  const statusTitle = $derived(
    $wsStatus === "connected" ? "Sync in tempo reale attivo" :
    $wsStatus === "connecting" ? "Connessione in corso..." : "Sync non attivo"
  );
</script>

<nav>
  <a href="/">DietPlanner</a>
  <span class="sep">|</span>
  <a href="/ingredienti">Ingredienti</a>
  <a href="/ricette">Ricette</a>
  <a href="/giornate">Giornate</a>
  <a href="/liste-spesa">Liste Spesa</a>
  <a href="/fabbisogno">Fabbisogno</a>
  <div class="ws-indicator" title={statusTitle}>
    <span class="dot" style="background:{statusColor}"></span>
    <span class="ws-label">{$wsStatus === "connected" ? "live" : $wsStatus}</span>
  </div>
</nav>

<main>
  {@render children()}
</main>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) {
    font-family: system-ui, sans-serif;
    font-size: 15px;
    background: #f8f9fa;
    color: #212529;
  }
  nav {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.65rem 1.5rem;
    background: #fff;
    border-bottom: 1px solid #dee2e6;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  nav a {
    color: #495057;
    text-decoration: none;
    font-weight: 500;
  }
  nav a:first-child { font-weight: 700; color: #228be6; }
  nav a:hover { color: #228be6; }
  .sep { color: #dee2e6; }
  .ws-indicator {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    cursor: default;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    transition: background 0.3s;
  }
  .ws-label { font-size: 0.75rem; color: #868e96; }
  main {
    padding: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
  }
</style>
