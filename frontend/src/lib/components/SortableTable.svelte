<script lang="ts" generics="T extends Record<string, unknown>">
  type Column = {
    key: string;
    label: string;
    numeric?: boolean;
    format?: (val: unknown) => string;
  };

  let {
    columns,
    rows,
    onrowclick,
    ondelete,
  }: {
    columns: Column[];
    rows: T[];
    onrowclick?: (row: T) => void;
    ondelete?: (row: T) => void;
  } = $props();

  let sortKey = $state<string | null>(null);
  let sortDir = $state<"asc" | "desc">("asc");

  function toggleSort(key: string) {
    if (sortKey === key) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDir = "asc";
    }
  }

  let sorted = $derived(() => {
    if (!sortKey) return rows;
    const key = sortKey;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av ?? "").localeCompare(String(bv ?? ""), "it") * dir;
    });
  });
</script>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        {#each columns as col}
          <th
            class:numeric={col.numeric}
            class:sorted={sortKey === col.key}
            onclick={() => toggleSort(col.key)}
          >
            {col.label}
            {#if sortKey === col.key}
              <span class="sort-icon">{sortDir === "asc" ? "↑" : "↓"}</span>
            {/if}
          </th>
        {/each}
        {#if ondelete}<th class="action-col"></th>{/if}
      </tr>
    </thead>
    <tbody>
      {#each sorted() as row}
        <tr
          class:clickable={!!onrowclick}
          onclick={() => onrowclick?.(row)}
        >
          {#each columns as col}
            <td class:numeric={col.numeric}>
              {col.format ? col.format(row[col.key]) : (row[col.key] ?? "—")}
            </td>
          {/each}
          {#if ondelete}
            <td class="action-col">
              <button
                class="delete-btn"
                title="Elimina"
                onclick={(e) => { e.stopPropagation(); ondelete(row); }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                  <path d="M10 11v6"></path><path d="M14 11v6"></path>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                </svg>
              </button>
            </td>
          {/if}
        </tr>
      {/each}
      {#if rows.length === 0}
        <tr><td colspan={columns.length + (ondelete ? 1 : 0)} class="empty">Nessun elemento</td></tr>
      {/if}
    </tbody>
  </table>
</div>

<style>
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th {
    text-align: left;
    padding: 0.5rem 0.75rem;
    background: #f1f3f5;
    border-bottom: 2px solid #dee2e6;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }
  th:hover { background: #e9ecef; }
  th.sorted { color: #228be6; }
  th.numeric, td.numeric { text-align: right; }
  .sort-icon { margin-left: 0.3rem; }
  td {
    padding: 0.45rem 0.75rem;
    border-bottom: 1px solid #f1f3f5;
    white-space: nowrap;
  }
  tr.clickable { cursor: pointer; }
  tr.clickable:hover td { background: #e7f5ff; }
  .empty { text-align: center; color: #868e96; padding: 1.5rem; }
  .action-col { width: 2.5rem; text-align: center; padding: 0 0.25rem; }
  .delete-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #fa5252;
    padding: 0.3rem;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    opacity: 0.6;
  }
  .delete-btn:hover { opacity: 1; background: #fff5f5; }
</style>
