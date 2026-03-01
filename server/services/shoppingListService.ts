import type { ShoppingListItem } from "../types";

export function generateShoppingListHtml(items: ShoppingListItem[]): string {
  const costoTotale = items.reduce((sum, i) => sum + (i.costoTotale ?? 0), 0);
  const hasCosti = items.some((i) => i.costoTotale !== null);

  const rows = items
    .map((item) => {
      const qta = item.totaleUnita !== null && item.nome_unita
        ? `${item.totaleUnita} ${item.nome_unita}`
        : `${item.totaleGrammi} g`;

      const costoCell = hasCosti
        ? `<td class="costo">${item.costoTotale !== null ? `€${item.costoTotale.toFixed(2)}` : "—"}</td>`
        : "";

      return `
    <li class="item">
      <label>
        <input type="checkbox" />
        <span class="nome">${escapeHtml(item.nome)}</span>
        <span class="qta">${qta}</span>
      </label>
      <div class="dispensa">
        <label class="dispensa-label">
          Ho già:
          <input type="number" min="0" step="0.5" class="dispensa-input" />
          <span class="dispensa-unit">${item.nome_unita ? escapeHtml(item.nome_unita) : "g"}</span>
        </label>
      </div>
    </li>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lista della Spesa</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 600px; margin: auto; color: #212529; }
    h1 { margin-bottom: 0.5rem; }
    .meta { color: #868e96; font-size: 0.85rem; margin-bottom: 1.5rem; }
    ul { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }
    .item {
      padding: 0.75rem 1rem;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      background: #fff;
    }
    .item label { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; }
    .item input[type=checkbox] { width: 1.1rem; height: 1.1rem; flex-shrink: 0; }
    .nome { font-weight: 500; flex: 1; }
    .qta { color: #495057; font-size: 0.9rem; }
    .item label:has(input:checked) .nome { text-decoration: line-through; color: #868e96; }
    .dispensa { margin-top: 0.5rem; padding-left: 1.85rem; }
    .dispensa-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #868e96; }
    .dispensa-input { width: 4rem; padding: 0.2rem 0.4rem; border: 1px solid #dee2e6; border-radius: 4px; }
    ${hasCosti ? `.costo { font-size: 0.85rem; color: #495057; text-align: right; min-width: 4rem; }
    .totale { margin-top: 1rem; text-align: right; font-weight: 600; }` : ""}
    @media print {
      .dispensa { display: none; }
      body { padding: 1rem; }
    }
  </style>
</head>
<body>
  <h1>Lista della Spesa</h1>
  <p class="meta">Generata il ${new Date().toLocaleDateString("it-IT", { dateStyle: "long" })}</p>
  <ul>
${rows}
  </ul>
  ${hasCosti ? `<p class="totale">Costo stimato: €${costoTotale.toFixed(2)}</p>` : ""}
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
