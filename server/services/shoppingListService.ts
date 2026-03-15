import type { ShoppingListItem } from "../types";

export interface RicettaExport {
  nome: string;
  preparazione: string;
  ingredienti: Array<{ nome: string; quantita: number; unita: string }>;
}

export function generateShoppingListHtml(items: ShoppingListItem[], ricette: RicettaExport[] = []): string {
  const costoTotale = items.reduce((sum, i) => sum + (i.costoTotale ?? 0), 0);
  const hasCosti = items.some((i) => i.costoTotale !== null);

  const rows = items
    .map((item) => {
      const isUnita = item.totaleUnita !== null && item.nome_unita;
      const qta = isUnita
        ? `${item.totaleUnita} ${item.nome_unita}`
        : `${item.totaleGrammi} g`;

      const costoCell = hasCosti
        ? `<td class="costo">${item.costoTotale !== null ? `€${item.costoTotale.toFixed(2)}` : "—"}</td>`
        : "";

      const dispUnit = item.nome_unita ? escapeHtml(item.nome_unita) : "g";
      const pesoUnitaAttr = item.peso_unita ? ` data-peso-unita="${item.peso_unita}"` : "";
      const nomeUnitaAttr = item.nome_unita ? ` data-nome-unita="${escapeHtml(item.nome_unita)}"` : "";

      return `
    <li class="item" data-total-g="${item.totaleGrammi}"${pesoUnitaAttr}${nomeUnitaAttr}>
      <label>
        <input type="checkbox" />
        <span class="nome">${escapeHtml(item.nome)}</span>
        <span class="qta">${qta}</span>
      </label>
      <div class="dispensa">
        <label class="dispensa-label">
          Ho già:
          <input type="number" min="0" step="0.5" class="dispensa-input" />
          <span class="dispensa-unit">${dispUnit}</span>
        </label>
      </div>
    </li>`;
    })
    .join("\n");

  const ricetteHtml = ricette.length > 0
    ? `
  <hr class="sezione-sep" />
  <h1>Ricette</h1>
  ${ricette.map((r) => `
  <section class="ricetta">
    <h2>${escapeHtml(r.nome)}</h2>
    <h3>Ingredienti</h3>
    <table class="ing-table">
      <thead><tr><th>Ingrediente</th><th>Quantità</th></tr></thead>
      <tbody>
        ${r.ingredienti.map((i) => `<tr><td>${escapeHtml(i.nome)}</td><td>${i.quantita} ${escapeHtml(i.unita)}</td></tr>`).join("\n        ")}
      </tbody>
    </table>
    ${r.preparazione.trim() ? `<h3>Preparazione</h3><pre class="preparazione">${escapeHtml(r.preparazione.trim())}</pre>` : ""}
  </section>`).join("\n")}
`
    : "";

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lista della Spesa</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 700px; margin: auto; color: #212529; }
    h1 { margin-bottom: 0.5rem; }
    h2 { font-size: 1.2rem; margin: 1.5rem 0 0.5rem; }
    h3 { font-size: 0.95rem; color: #495057; margin: 0.75rem 0 0.35rem; }
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
    .sezione-sep { margin: 2.5rem 0; border: none; border-top: 2px solid #dee2e6; }
    .ricetta { margin-bottom: 2rem; }
    .ing-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .ing-table th, .ing-table td { text-align: left; padding: 0.35rem 0.6rem; border: 1px solid #dee2e6; }
    .ing-table th { background: #f8f9fa; font-weight: 600; }
    .preparazione { white-space: pre-wrap; font-family: inherit; font-size: 0.9rem; line-height: 1.6; background: #f8f9fa; padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid #dee2e6; }
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
  ${ricetteHtml}
  <script>
    document.querySelectorAll('.dispensa-input').forEach(function(input) {
      input.addEventListener('input', function() {
        var li = input.closest('.item');
        var totalG = parseFloat(li.dataset.totalG) || 0;
        var pesoUnita = parseFloat(li.dataset.pesoUnita) || 0;
        var nomeUnita = li.dataset.nomeUnita || 'g';
        var hoGia = parseFloat(input.value) || 0;
        var qtaSpan = li.querySelector('.qta');
        if (pesoUnita > 0) {
          var totalUnita = totalG / pesoUnita;
          var remaining = Math.max(0, totalUnita - hoGia);
          qtaSpan.textContent = (Math.round(remaining * 100) / 100) + ' ' + nomeUnita;
        } else {
          var remaining = Math.max(0, totalG - hoGia);
          qtaSpan.textContent = (Math.round(remaining * 100) / 100) + ' g';
        }
      });
    });
  </script>
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
