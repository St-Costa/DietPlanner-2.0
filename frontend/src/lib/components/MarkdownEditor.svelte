<script lang="ts">
  import { marked } from "marked";
  import DOMPurify from "dompurify";
  import { tick } from "svelte";

  let {
    value = $bindable(""),
    placeholder = "Clicca per scrivere...",
  }: {
    value?: string;
    placeholder?: string;
  } = $props();

  let editing = $state(false);
  let textarea: HTMLTextAreaElement | undefined = $state();

  const html = $derived(DOMPurify.sanitize(marked.parse(value) as string));

  async function startEdit() {
    editing = true;
    await tick();
    textarea?.focus();
  }

  function stopEdit() {
    editing = false;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      stopEdit();
    }
  }
</script>

<div class="editor">
  {#if editing}
    <textarea
      bind:this={textarea}
      bind:value
      onblur={stopEdit}
      onkeydown={onKeydown}
      rows="12"
      {placeholder}
    ></textarea>
  {:else}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="preview"
      class:empty={!value.trim()}
      onclick={startEdit}
      title="Clicca per modificare"
      role="textbox"
      tabindex="0"
      onfocus={startEdit}
    >
      {#if value.trim()}
        {@html html}
      {:else}
        <span class="placeholder">{placeholder}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .editor { display: flex; flex-direction: column; }

  textarea {
    padding: 0.75rem;
    border: 2px solid #228be6;
    border-radius: 6px;
    font-family: monospace;
    font-size: 0.875rem;
    resize: vertical;
    line-height: 1.6;
    min-height: 10rem;
    width: 100%;
    box-sizing: border-box;
    background: #fff;
  }
  textarea:focus { outline: none; }

  .preview {
    padding: 0.75rem;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    background: #fff;
    min-height: 10rem;
    cursor: text;
    font-size: 0.9rem;
    line-height: 1.6;
    transition: border-color 0.15s;
  }
  .preview:hover { border-color: #adb5bd; }
  .preview:focus { outline: 2px solid #228be6; border-color: transparent; }

  .placeholder { color: #adb5bd; font-style: italic; }

  :global(.preview h1) { font-size: 1.4rem; font-weight: 700; margin: 0.5rem 0 0.3rem; }
  :global(.preview h2) { font-size: 1.2rem; font-weight: 700; margin: 0.5rem 0 0.3rem; }
  :global(.preview h3) { font-size: 1rem; font-weight: 700; margin: 0.5rem 0 0.3rem; }
  :global(.preview p)  { margin-bottom: 0.4rem; }
  :global(.preview ul, .preview ol) { padding-left: 1.2rem; margin-bottom: 0.4rem; }
  :global(.preview li) { margin-bottom: 0.15rem; }
  :global(.preview code) { background: #f1f3f5; padding: 0.1rem 0.3rem; border-radius: 3px; font-family: monospace; font-size: 0.85em; }
  :global(.preview strong) { font-weight: 700; }
  :global(.preview em) { font-style: italic; }
</style>
