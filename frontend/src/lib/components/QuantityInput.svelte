<script lang="ts">
  let {
    value = $bindable(0),
    nomeUnita,
    min = 0,
    step = 1,
    disabled = false,
  }: {
    value?: number;
    nomeUnita?: string | null;
    min?: number;
    step?: number;
    disabled?: boolean;
  } = $props();

  const unitLabel = $derived(nomeUnita ?? "g");
</script>

<div class="qty-wrap">
  <input
    type="number"
    bind:value
    {min}
    {step}
    {disabled}
    class="qty-input"
  />
  <span class="qty-unit">{unitLabel}</span>
</div>

<style>
  .qty-wrap { display: flex; align-items: center; gap: 0.3rem; }
  .qty-input {
    width: 5rem;
    padding: 0.35rem 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.9rem;
    text-align: right;
  }
  .qty-input:disabled { background: #f8f9fa; }
  .qty-unit { font-size: 0.85rem; color: #868e96; white-space: nowrap; }
</style>
