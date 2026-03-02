# DietPlanner 2.0 — Guida per Claude Code

## Scopo
App locale per gestire la dieta personale su Ubuntu. Permette di creare ingredienti, ricette e giornate alimentari, con calcolo nutrizionale automatico e lista della spesa scaricabile in HTML.

## Come avviare
```bash
~/.bun/bin/bun dev          # backend (porta 3000) + frontend Vite (porta 5173)
# Aprire http://localhost:5173 nel browser
```
Il backend Bun si riavvia automaticamente (`--watch`) quando si modificano file in `server/`.
Vite HMR aggiorna il frontend senza reload quando si modificano file in `frontend/src/`.

## Stack
| Livello | Tecnologia |
|---|---|
| Runtime server | Bun |
| Frontend | SvelteKit 5 con adapter-static (SPA) |
| Storage | File `.md` con frontmatter YAML in `data/` |
| Real-time | WebSocket nativo Bun + chokidar |
| Markdown runtime | marked + DOMPurify |

## Struttura dati
I dati sono file `.md` con YAML frontmatter in tre cartelle:
- `data/Ingredienti/<slug>.md`
- `data/Ricette/<slug>.md`
- `data/Giornate/<slug>.md`

**L'ID di ogni entità è il nome del file (slug)** — non cambia mai dopo la creazione.
I valori nutrizionali **non sono salvati**: vengono calcolati dinamicamente al momento della lettura.

## Architettura server (`server/`)
```
server/
├── index.ts              # Bun.serve() con HTTP + WebSocket upgrade
├── router.ts             # routing manuale, CORS, serve static in prod
├── types.ts              # interfacce TypeScript condivise
├── handlers/             # un file per entità + listaSpesa + scraper
├── parsers/
│   ├── frontmatter.ts    # parseFile() / writeFile() con gray-matter
│   └── nutritionCalc.ts  # scaleNutrition(), toGrams(), computeRicettaDettaglio(), computeExtraAgg()
└── services/
    ├── fileService.ts    # CRUD su file .md + cascade helpers
    ├── slugService.ts    # generazione slug unici
    ├── watcherService.ts # chokidar → broadcast WSMessage a tutti i client
    ├── shoppingListService.ts
    └── scraperService.ts # scraping deterministico nutritionvalue.org (node-html-parser)
```

## Architettura frontend (`frontend/src/`)
```
lib/
├── api.ts               # fetch wrappers tipizzati per tutte le API
├── ws.ts                # singleton WebSocket con auto-reconnect (exp. backoff)
├── types.ts             # mirror dei tipi server (mantenere sincronizzati)
├── stores/
│   ├── ingredienti.ts / ricette.ts / giornate.ts  # .load() lazy, .reload(), patch on WS events
│   └── settings.ts      # settingsStore: obiettivi micronutrienti per adulto (localStorage)
├── utils/nutrition.ts   # fmt(), sumNutrition(), zeroNutrition()
└── components/
    ├── SortableTable.svelte      # tabella generica con sort + prop ondelete
    ├── MarkdownEditor.svelte     # click-to-edit: rendered view → textarea su click
    ├── MacroPieChart.svelte      # grafico a torta SVG (kcal da prot/carbo/grassi)
    ├── NutritionSummaryCard.svelte # riquadro nutrizione con MacroPieChart integrato
    ├── SpiderChart.svelte        # grafico radar SVG micronutrienti (valore vs obiettivo)
    ├── OmegaBarChart.svelte      # barre ω-3/ω-6 con % su target + rapporto colorato
    ├── IngredienteForm.svelte    # form create/edit ingrediente
    ├── RicettaForm.svelte        # form create/edit ricetta con calcoli live
    └── GiornataForm.svelte       # form create/edit giornata
```

## Decisioni architetturali chiave

### WebSocket in sviluppo
Vite non può fare da proxy al WebSocket perché Bun non implementa `socket.destroySoon`.
**Fix**: il WebSocket si connette **direttamente** a `localhost:3000` in dev:
```typescript
// frontend/src/lib/ws.ts
const host = import.meta.env.DEV ? "localhost:3000" : location.host;
```

### SvelteKit adapter-static
Il frontend è buildato come SPA statica. In produzione Bun serve i file da `frontend/build/`.
Non c'è SSR. `prerender.entries = []` nel config.

### Cascade delete
- Eliminare un **ingrediente** → rimuove automaticamente quell'ingrediente da tutte le ricette che lo contengono (aggiornando i file .md). La ricetta non viene eliminata.
- Eliminare una **ricetta** → rimuove automaticamente la ricetta da tutte le giornate che la contengono.
Le funzioni cascade sono `removeIngredienteFromRicette()` e `removeRicettaFromGiornate()` in `fileService.ts`.

### IDs stabili
Ingredienti e ricette si referenziano per **id** (= nome file slug), non per `nome`. Rinominare il campo `nome` non richiede cascade. L'id non cambia mai dopo la creazione.

### Calcolo valori nutrizionali
Sempre dinamico, mai salvato su disco:
- Scaling: `valore_per_100g * grammi / 100`
- Unità → grammi: `quantita * peso_unita`
- Grafico a torta (kcal): proteine×4, carboidrati×4, grassi×9

### Grafici spider micronutrienti (vitamine e minerali)
`RicettaForm` e `GiornataForm` mostrano due grafici radar SVG (vitamine + minerali) quando almeno un ingrediente ha `extra_nutrienti`.
- Componente: `SpiderChart.svelte` — props `entries: SpiderEntry[]`, `title: string`
- `SpiderEntry`: `{ label, labelFull, valore, target, unita }`
- Gli obiettivi giornalieri sono salvati in `settingsStore` (localStorage, `dietplanner_settings_v1`)
- `VITAMINE_DEF` e `MINERALI_DEF` in `stores/settings.ts` definiscono i 12+8 nutrienti con label, unità e default RDI per adulto maschio
- Il pulsante **⚙ Obiettivi** apre un modal per modificare i target; condiviso tra ricette e giornate
- In `GiornataForm`, `extra_nutrienti` arriva da `GiornataRicettaDettaglio.extra_nutrienti` (aggregato server-side da `enrichGiornata`)
- Quando si aggiunge una ricetta al form giornata, `extra_nutrienti` viene passato da `RicettaFull.extra_nutrienti`

### Grafico Omega-3 / Omega-6
`RicettaForm` e `GiornataForm` mostrano `OmegaBarChart.svelte` sotto i grafici spider, quando almeno uno tra ω-3 e ω-6 è > 0.
- Props: `omega3`, `omega6`, `omega3Target`, `omega6Target` (tutti in grammi)
- nutritionvalue.org non espone chiavi aggregate: i valori si sommano dagli acidi grassi individuali per pattern di chiave (`_n_3_` → ω-3, `_n_6_` → ω-6). Se esistono le chiavi dirette `omega_3_fatty_acids`/`omega_6_fatty_acids` vengono usate quelle.
- Barre scalate sull'obiettivo (100% = barra piena, capped visivamente al 150%; linea grigia a quota 100%)
- ω-3: verde ≥100%, arancione ≥50%, rosso <50%; ω-6: neutro (il rapporto indica già la qualità)
- Rapporto ω-6/ω-3: verde ≤4:1, arancione ≤10:1, rosso >10:1
- Target default: ω-3 = 2g, ω-6 = 10g — modificabili dal modal **⚙ Obiettivi** (sezione "Omega")
- `settingsStore` espone `omega: OmegaTargets` e metodo `setOmegaTarget(key, value)`

### Export MD giornata
`GET /api/giornate/:id/export-md` → `text/markdown` con attachment.
Contiene per ogni ricetta: tabella macronutrienti per ingrediente + micronutrienti per ingrediente + totali ricetta.
In fondo: totali giornata (macros + vitamine + minerali + altri nutrienti), organizzati in sezioni separate.
Il bottone **↓ Esporta .md** è visibile nell'header di `GiornataForm` solo in modalità modifica.

### Import da nutritionvalue.org
`POST /api/scrape-ingrediente` accetta `{ url }` e restituisce un `ScrapeResult` (non salva nulla).
- URL validato: solo `www.nutritionvalue.org/*_nutritional_value.html`
- Parsing HTML deterministico con `node-html-parser` (no AI, no headless browser)
- I 9 campi core vengono mappati direttamente; tutto il resto (vitamine, minerali, amminoacidi…) va in `extra_nutrienti?: Record<string, { valore: number; unita: string }>` sul tipo `Ingrediente`
- `IngredienteForm` ha una sezione "Importa da URL" che pre-popola i campi; l'utente può modificare prima di salvare

### Campi numerici nel form ingrediente
I campi numerici usano `type="text"` con `inputmode="decimal"` anziché `type="number"`.
Questo permette di digitare sia `","` che `"."` come separatore decimale.
La funzione `parseNum(s)` normalizza la virgola in punto prima di inviare al server.

## API REST (porta 3000)
```
GET/POST   /api/ingredienti
GET/PUT/DELETE /api/ingredienti/:id
GET        /api/ingredienti/tipi
GET/POST   /api/ricette
GET/PUT/DELETE /api/ricette/:id
GET/POST   /api/giornate
GET/PUT/DELETE /api/giornate/:id
GET        /api/giornate/:id/export-md → Markdown download (tutte le info nutrizionali)
POST       /api/lista-spesa          → HTML download
GET        /api/slugify?nome=&tipo=
POST       /api/scrape-ingrediente   → ScrapeResult (scraping nutritionvalue.org)
```

## Protocollo WebSocket
Server → client only. Messaggi:
```typescript
{ type: "file_changed" | "file_created" | "file_deleted" | "connected", entity: "ingrediente"|"ricetta"|"giornata", id: string, timestamp: string }
```
I client reagiscono aggiornando lo store corrispondente.

## Pattern tipici

### Aggiungere una nuova entità
1. Aggiungere il tipo in `server/types.ts` e `frontend/src/lib/types.ts`
2. Aggiungere il folder in `fileService.ts` (FOLDER_MAP)
3. Creare `server/handlers/nuovaEntita.ts`
4. Registrare il handler in `server/router.ts`
5. Creare `frontend/src/lib/stores/nuovaEntita.ts`
6. Creare i componenti e le route

### Aggiungere un campo a un'entità esistente
1. Aggiungere il campo al tipo in `server/types.ts` e `frontend/src/lib/types.ts`
2. Aggiungere nel form component
3. Aggiungere nella `validateInput` del handler
4. Il file .md si aggiorna automaticamente tramite `writeFile()` (gray-matter)

## Note importanti
- **Non installare node** — si usa esclusivamente Bun
- Il frontend usa **Svelte 5** (rune: `$state`, `$derived`, `$props`) — non usare sintassi Svelte 4
- Gli eventi form si gestiscono con `onsubmit={(e) => { e.preventDefault(); fn(); }}` (non `|preventDefault`)
- `SortableTable` accetta `ondelete?: (row: T) => void` per aggiungere il cestino
- `MacroPieChart` accetta `showGrams={true}` per mostrare i grammi in legenda
- `SpiderChart` esporta `interface SpiderEntry` — importarla come `import type { SpiderEntry } from "./SpiderChart.svelte"`
- `computeExtraAgg(ingredientiEntries, ingMap)` in `nutritionCalc.ts` aggrega `extra_nutrienti` scalando per grammi — usarla ogni volta che serve il totale micronutrienti di una ricetta
- `OmegaBarChart` accetta `omega3`, `omega6`, `omega3Target`, `omega6Target` (g) — i target vengono da `$settingsStore.omega`
