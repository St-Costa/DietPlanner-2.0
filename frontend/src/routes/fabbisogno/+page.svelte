<script lang="ts">
  import { onMount } from 'svelte';
  import MacroPieChart from '$lib/components/MacroPieChart.svelte';

  const STORAGE_KEY = 'dietplanner_fabbisogno_v1';

  // ── Input states ──────────────────────────────────────────────────────────
  let sesso         = $state<'M' | 'F'>('M');
  let s_altezza     = $state('175');
  let s_peso        = $state('80');
  let s_eta         = $state('30');
  let multiplier    = $state(1.3);
  let s_prot        = $state('2.4');
  let s_carbs       = $state('3.9');
  let preset_idx    = $state<number | null>(null); // null = usa tdee o custom
  let s_cal_custom  = $state('');
  let tipo_giorno   = $state<'off' | 'deficit' | 'surplus'>('off');
  let dirty         = $state(false);
  let saved_flash   = $state(false);

  function parseNum(s: string): number {
    const n = parseFloat(s.replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sesso, s_altezza, s_peso, s_eta, multiplier,
        s_prot, s_carbs, preset_idx, s_cal_custom, tipo_giorno,
      }));
    } catch {}
    dirty = false;
    saved_flash = true;
    setTimeout(() => { saved_flash = false; }, 2000);
  }

  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.sesso)         sesso        = d.sesso;
      if (d.s_altezza)     s_altezza    = d.s_altezza;
      if (d.s_peso)        s_peso       = d.s_peso;
      if (d.s_eta)         s_eta        = d.s_eta;
      if (d.multiplier != null) multiplier = d.multiplier;
      if (d.s_prot)        s_prot       = d.s_prot;
      if (d.s_carbs)       s_carbs      = d.s_carbs;
      if (d.preset_idx != null) preset_idx = d.preset_idx;
      if (d.s_cal_custom != null) s_cal_custom = d.s_cal_custom;
      if (d.tipo_giorno)   tipo_giorno  = d.tipo_giorno;
    } catch {}
  });

  // ── Derivazioni ───────────────────────────────────────────────────────────
  const altezza_cm    = $derived(parseNum(s_altezza));
  const peso_kg       = $derived(parseNum(s_peso));
  const eta           = $derived(parseNum(s_eta));
  const protein_g_kg  = $derived(parseNum(s_prot));
  const carbs_g_kg    = $derived(parseNum(s_carbs));

  // Harris-Benedict BMR
  const bmr = $derived(
    sesso === 'M'
      ? 66.5 + 13.75 * peso_kg + 5 * altezza_cm - 6.75 * eta
      : 655.1 + 9.563 * peso_kg + 1.85 * altezza_cm - 4.676 * eta
  );
  const tdee = $derived(Math.round(bmr * multiplier));

  const presets = $derived([
    { label: '+20% surplus', kcal: Math.round(tdee * 1.2) },
    { label: '+10% surplus', kcal: Math.round(tdee * 1.1) },
    { label: 'Mantenimento', kcal: tdee },
    { label: '−10% deficit', kcal: Math.round(tdee * 0.9) },
    { label: '−20% deficit', kcal: Math.round(tdee * 0.8) },
  ]);

  const daily_kcal = $derived(
    preset_idx !== null
      ? presets[preset_idx].kcal
      : (s_cal_custom.trim() ? parseNum(s_cal_custom) || tdee : tdee)
  );

  // Macros
  const prot_g    = $derived(Math.round(protein_g_kg * peso_kg * 10) / 10);
  const carbs_g   = $derived(Math.round(carbs_g_kg   * peso_kg * 10) / 10);
  const prot_kcal = $derived(Math.round(prot_g  * 4));
  const carbs_kcal= $derived(Math.round(carbs_g * 4));
  const remaining = $derived(daily_kcal - prot_kcal - carbs_kcal);
  const fat_g     = $derived(remaining > 0 ? Math.round(remaining / 9 * 10) / 10 : 0);
  const fat_kcal  = $derived(Math.round(fat_g * 9));
  const fat_neg   = $derived(remaining < 0);

  // ── Distribuzioni pasto ───────────────────────────────────────────────────
  // Coefficienti derivati dai valori del foglio Google.
  // Ogni coefficiente è la frazione del macro totale assegnata a quel pasto.

  interface MealDef { label: string; pC: number; cC: number; fC: number; }

  const OFF_DAY: MealDef[] = [
    { label: 'M1', pC: 68.75/273.625, cC: 175/437.5,    fC: 7/45  },
    { label: 'M2', pC: 45.375/273.625, cC: 65.625/437.5, fC: 7/45  },
    { label: 'M3', pC: 45.375/273.625, cC: 65.625/437.5, fC: 7/45  },
    { label: 'M4', pC: 45.375/273.625, cC: 65.625/437.5, fC: 7/45  },
    { label: 'M5', pC: 68.75/273.625, cC: 65.625/437.5,  fC: 17/45 },
  ];

  const TRAINING_DEFICIT: MealDef[] = [
    { label: 'M1',       pC: 66/276, cC: 0,       fC: 19/47 },
    { label: 'Pre-WO',   pC: 39/276, cC: 175/437,  fC: 0     },
    { label: 'Intra-WO', pC: 22/276, cC: 87/437,   fC: 0     },
    { label: 'Post-WO',  pC: 44/276, cC: 175/437,  fC: 0     },
    { label: 'M4',       pC: 39/276, cC: 0,        fC: 9/47  },
    { label: 'M5',       pC: 66/276, cC: 0,        fC: 19/47 },
  ];

  const TRAINING_SURPLUS: MealDef[] = [
    { label: 'M1',       pC: 66/276, cC: 87.5/437.5, fC: 19/47 },
    { label: 'Pre-WO',   pC: 39/276, cC: 87.5/437.5, fC: 0     },
    { label: 'Intra-WO', pC: 22/276, cC: 58/437.5,   fC: 0     },
    { label: 'Post-WO',  pC: 44/276, cC: 117/437.5,  fC: 0     },
    { label: 'M4',       pC: 39/276, cC: 87.5/437.5, fC: 9/47  },
    { label: 'M5',       pC: 66/276, cC: 0,           fC: 19/47 },
  ];

  const ACTIVITIES = [
    { label: 'Sedentario',   desc: 'Nessun esercizio',   value: 1.0 },
    { label: 'Leggero',      desc: '1–3 gg/settimana',   value: 1.2 },
    { label: 'Moderato',     desc: '3–5 gg/settimana',   value: 1.3 },
    { label: 'Attivo',       desc: '6–7 gg/settimana',   value: 1.4 },
    { label: 'Molto attivo', desc: '2 sessioni/giorno',  value: 1.5 },
  ];

  const meals = $derived(
    tipo_giorno === 'off'     ? OFF_DAY :
    tipo_giorno === 'deficit' ? TRAINING_DEFICIT :
                                TRAINING_SURPLUS
  );

  function mealRow(m: MealDef) {
    const p = Math.round(prot_g  * m.pC);
    const c = Math.round(carbs_g * m.cC);
    const f = Math.round(fat_g   * m.fC);
    return { prot: p, carbs: c, fat: f, kcal: p * 4 + c * 4 + f * 9 };
  }

  function n(v: number) { return Math.round(v); }
  function pct(v: number) { return v.toFixed(1) + '%'; }

  function selectPreset(idx: number) {
    preset_idx   = idx;
    s_cal_custom = '';
    dirty = true;
  }

  function onCustomInput(e: Event) {
    s_cal_custom = (e.currentTarget as HTMLInputElement).value;
    preset_idx   = null;
    dirty = true;
  }
</script>

<div class="page">
  <div class="page-header">
    <div>
      <h1>Calcolatore Fabbisogno Calorico</h1>
      <p class="source">Sistema basato su <a href="https://www.youtube.com/watch?v=ELxTSv-5Ykg&t=335s" target="_blank" rel="noopener">questo video</a></p>
    </div>
    <button class="save-btn" class:flash={saved_flash} disabled={!dirty} onclick={save}>
      {saved_flash ? '✓ Salvato' : 'Salva'}
    </button>
  </div>

  <!-- ── Sezione 1: dati personali + attività ───────────────────────────── -->
  <div class="grid-2">
    <div class="card">
      <h2>Dati Personali</h2>

      <div class="field">
        <label>Sesso</label>
        <div class="toggle-group">
          <button class:active={sesso === 'M'} onclick={() => { sesso = 'M'; dirty = true; }}>Uomo</button>
          <button class:active={sesso === 'F'} onclick={() => { sesso = 'F'; dirty = true; }}>Donna</button>
        </div>
      </div>

      <div class="row-3">
        <div class="field">
          <label>Altezza (cm)</label>
          <input type="text" inputmode="decimal" value={s_altezza}
            oninput={(e) => { s_altezza = (e.currentTarget as HTMLInputElement).value; dirty = true; }} />
        </div>
        <div class="field">
          <label>Peso (kg)</label>
          <input type="text" inputmode="decimal" value={s_peso}
            oninput={(e) => { s_peso = (e.currentTarget as HTMLInputElement).value; dirty = true; }} />
        </div>
        <div class="field">
          <label>Età</label>
          <input type="text" inputmode="numeric" value={s_eta}
            oninput={(e) => { s_eta = (e.currentTarget as HTMLInputElement).value; dirty = true; }} />
        </div>
      </div>

      <h2 style="margin-top:1.5rem">Livello di Attività</h2>
      <div class="activity-grid">
        {#each ACTIVITIES as a}
          <button
            class="activity-btn"
            class:active={multiplier === a.value}
            onclick={() => { multiplier = a.value; dirty = true; }}
          >
            <span class="a-label">{a.label}</span>
            <span class="a-desc">{a.desc}</span>
            <span class="a-mult">×{a.value}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- ── Sezione 2: BMR / calorie ──────────────────────────────────────── -->
    <div class="card">
      <h2>BMR / TDEE</h2>

      <div class="result-row">
        <span class="rl">BMR ({sesso === 'M' ? 'uomo' : 'donna'}, Harris-Benedict)</span>
        <span class="rv">{n(bmr)} kcal</span>
      </div>
      <div class="result-row highlight">
        <span class="rl">TDEE (mantenimento)</span>
        <span class="rv">{n(tdee)} kcal</span>
      </div>

      <h2 style="margin-top:1.5rem;margin-bottom:0.75rem">Obiettivo calorico</h2>

      <div class="presets">
        {#each presets as p, i}
          <button
            class="preset-btn"
            class:active={preset_idx === i}
            onclick={() => selectPreset(i)}
          >
            <span class="p-label">{p.label}</span>
            <span class="p-kcal">{p.kcal} kcal</span>
          </button>
        {/each}
      </div>

      <div class="field" style="margin-top:1rem">
        <label>Calorie personalizzate</label>
        <div class="custom-row">
          <input
            type="text"
            inputmode="numeric"
            placeholder={String(tdee)}
            value={s_cal_custom}
            oninput={onCustomInput}
          />
          {#if s_cal_custom.trim() && preset_idx === null}
            <span class="custom-badge">custom</span>
          {/if}
        </div>
      </div>

      <div class="daily-total" class:warn={fat_neg}>
        <span>Calorie giornaliere selezionate</span>
        <strong>{daily_kcal} kcal</strong>
      </div>
    </div>
  </div>

  <!-- ── Sezione 3: macro target ───────────────────────────────────────────── -->
  <div class="card">
    <h2>Macro Target</h2>

    <div class="macro-inputs">
      <div class="field">
        <label>Proteine (g/kg)</label>
        <input type="text" inputmode="decimal" value={s_prot}
          oninput={(e) => { s_prot = (e.currentTarget as HTMLInputElement).value; dirty = true; }} />
      </div>
      <div class="field">
        <label>Carboidrati (g/kg)</label>
        <input type="text" inputmode="decimal" value={s_carbs}
          oninput={(e) => { s_carbs = (e.currentTarget as HTMLInputElement).value; dirty = true; }} />
      </div>
    </div>

    {#if fat_neg}
      <div class="alert">
        Proteine + carboidrati superano le calorie giornaliere. Riduci i g/lb o aumenta le calorie.
      </div>
    {/if}

    <div class="macro-layout">
      <div class="macro-table-wrap">
        <table class="macro-table">
          <thead>
            <tr>
              <th></th>
              <th>g</th>
              <th>kcal</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="dot" style="background:#4c8ef7"></span> Proteine</td>
              <td>{prot_g} g</td>
              <td>{prot_kcal} kcal</td>
              <td>{pct(prot_kcal / (daily_kcal || 1) * 100)}</td>
            </tr>
            <tr>
              <td><span class="dot" style="background:#a0522d"></span> Carboidrati</td>
              <td>{carbs_g} g</td>
              <td>{carbs_kcal} kcal</td>
              <td>{pct(carbs_kcal / (daily_kcal || 1) * 100)}</td>
            </tr>
            <tr class:dim={fat_neg}>
              <td><span class="dot" style="background:#fcc419"></span> Grassi (auto)</td>
              <td>{fat_g} g</td>
              <td>{fat_kcal} kcal</td>
              <td>{pct(fat_kcal / (daily_kcal || 1) * 100)}</td>
            </tr>
            <tr class="total-row">
              <td><strong>Totale</strong></td>
              <td></td>
              <td><strong>{n(prot_kcal + carbs_kcal + fat_kcal)} kcal</strong></td>
              <td><strong>100%</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pie-wrap">
        <MacroPieChart proteine={prot_g} carboidrati={carbs_g} grassi={fat_g} showGrams={true} />
      </div>
    </div>
  </div>

  <!-- ── Sezione 4: distribuzione pasti ───────────────────────────────────── -->
  <div class="card">
    <h2>Distribuzione Pasti</h2>

    <div class="tabs">
      <button class:active={tipo_giorno === 'off'}     onclick={() => { tipo_giorno = 'off'; dirty = true; }}>
        Giorno di Riposo
      </button>
      <button class:active={tipo_giorno === 'deficit'} onclick={() => { tipo_giorno = 'deficit'; dirty = true; }}>
        Allenamento — Deficit
      </button>
      <button class:active={tipo_giorno === 'surplus'} onclick={() => { tipo_giorno = 'surplus'; dirty = true; }}>
        Allenamento — Surplus
      </button>
    </div>

    <table class="meal-table">
      <thead>
        <tr>
          <th>Pasto</th>
          <th>Proteine</th>
          <th>Carboidrati</th>
          <th>Grassi</th>
          <th>Kcal</th>
        </tr>
      </thead>
      <tbody>
        {#each meals as m}
          {@const r = mealRow(m)}
          <tr>
            <td class="meal-label">{m.label}</td>
            <td>{r.prot} g</td>
            <td>{r.carbs} g</td>
            <td>{r.fat} g</td>
            <td class="kcal-cell">{r.kcal} kcal</td>
          </tr>
        {/each}
      </tbody>
      <tfoot>
        <tr>
          <td><strong>Totale</strong></td>
          <td><strong>{prot_g} g</strong></td>
          <td><strong>{carbs_g} g</strong></td>
          <td><strong>{fat_g} g</strong></td>
          <td class="kcal-cell"><strong>{daily_kcal} kcal</strong></td>
        </tr>
      </tfoot>
    </table>

    <p class="note">
      I valori per pasto sono arrotondati al grammo.
      Pre-WO = pre-allenamento · Intra-WO = durante · Post-WO = post-allenamento.
    </p>
  </div>
</div>

<style>
  .page { max-width: 960px; }
  .page-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  h1 { font-size: 1.5rem; font-weight: 700; color: #228be6; margin-bottom: 0.2rem; }
  .source { font-size: 0.78rem; color: #868e96; }
  .source a { color: #228be6; text-decoration: none; }
  .source a:hover { text-decoration: underline; }
  .save-btn {
    padding: 0.45rem 1.1rem;
    border: none;
    border-radius: 6px;
    background: #228be6;
    color: #fff;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.2s;
    white-space: nowrap;
  }
  .save-btn:disabled { background: #adb5bd; cursor: default; }
  .save-btn.flash { background: #40c057; }

  .card {
    background: #fff;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.25rem;
  }
  .card h2 {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #868e96;
    margin-bottom: 1rem;
  }

  /* ── Layout ───────────────────────────────────────────────────────────── */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
  }
  @media (max-width: 700px) {
    .grid-2 { grid-template-columns: 1fr; }
  }

  .row-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-top: 0.75rem;
  }

  /* ── Form fields ──────────────────────────────────────────────────────── */
  .field { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.75rem; }
  .field label { font-size: 0.8rem; color: #495057; font-weight: 500; }
  .field input {
    border: 1px solid #ced4da;
    border-radius: 6px;
    padding: 0.45rem 0.6rem;
    font-size: 0.9rem;
    font-family: inherit;
    width: 100%;
  }
  .field input:focus { outline: none; border-color: #228be6; }
  .field input.readonly { background: #f8f9fa; color: #868e96; cursor: default; }

  /* ── Sesso toggle ─────────────────────────────────────────────────────── */
  .toggle-group { display: flex; gap: 0; }
  .toggle-group button {
    padding: 0.4rem 1rem;
    border: 1px solid #ced4da;
    background: #fff;
    cursor: pointer;
    font-size: 0.85rem;
    color: #495057;
    font-family: inherit;
  }
  .toggle-group button:first-child { border-radius: 6px 0 0 6px; }
  .toggle-group button:last-child  { border-radius: 0 6px 6px 0; border-left: none; }
  .toggle-group button.active { background: #228be6; color: #fff; border-color: #228be6; }

  /* ── Activity buttons ─────────────────────────────────────────────────── */
  .activity-grid {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .activity-btn {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.75rem;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: border-color 0.15s, background 0.15s;
  }
  .activity-btn.active { border-color: #228be6; background: #e7f3ff; }
  .a-label { font-size: 0.85rem; font-weight: 600; color: #212529; }
  .a-desc  { font-size: 0.75rem; color: #868e96; }
  .a-mult  { font-size: 0.8rem; color: #228be6; font-weight: 600; }

  /* ── BMR / result rows ────────────────────────────────────────────────── */
  .result-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    margin-bottom: 0.4rem;
  }
  .result-row.highlight { background: #f1f8ff; }
  .rl { font-size: 0.85rem; color: #495057; }
  .rv { font-size: 1rem; font-weight: 700; color: #228be6; }

  /* ── Preset buttons ───────────────────────────────────────────────────── */
  .presets { display: flex; flex-direction: column; gap: 0.35rem; }
  .preset-btn {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;
    font-family: inherit;
    transition: border-color 0.15s, background 0.15s;
  }
  .preset-btn.active { border-color: #228be6; background: #e7f3ff; }
  .p-label { font-size: 0.85rem; color: #495057; }
  .p-kcal  { font-size: 0.9rem; font-weight: 700; color: #228be6; }

  /* ── Custom input row ─────────────────────────────────────────────────── */
  .custom-row { display: flex; align-items: center; gap: 0.5rem; }
  .custom-row input { flex: 1; }
  .custom-badge {
    font-size: 0.7rem;
    background: #fd7e14;
    color: #fff;
    padding: 0.15rem 0.45rem;
    border-radius: 99px;
    white-space: nowrap;
  }

  /* ── Daily total bar ──────────────────────────────────────────────────── */
  .daily-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.75rem;
    background: #e7f3ff;
    border-radius: 6px;
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: #495057;
  }
  .daily-total.warn { background: #fff3cd; }
  .daily-total strong { font-size: 1.1rem; color: #228be6; }
  .daily-total.warn strong { color: #e67700; }

  /* ── Alert ────────────────────────────────────────────────────────────── */
  .alert {
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 6px;
    padding: 0.6rem 0.75rem;
    font-size: 0.82rem;
    color: #664d03;
    margin-bottom: 1rem;
  }

  /* ── Macro inputs ─────────────────────────────────────────────────────── */
  .macro-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  /* ── Macro table + pie ────────────────────────────────────────────────── */
  .macro-layout {
    display: flex;
    align-items: center;
    gap: 2rem;
  }
  .macro-table-wrap { flex: 1; overflow-x: auto; }
  .pie-wrap { flex-shrink: 0; }

  .macro-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  .macro-table th {
    text-align: right;
    padding: 0.4rem 0.6rem;
    border-bottom: 2px solid #dee2e6;
    font-size: 0.75rem;
    color: #868e96;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .macro-table th:first-child { text-align: left; }
  .macro-table td {
    padding: 0.5rem 0.6rem;
    border-bottom: 1px solid #f1f3f5;
    text-align: right;
    color: #495057;
  }
  .macro-table td:first-child { text-align: left; display: flex; align-items: center; gap: 0.4rem; }
  .macro-table tr.total-row td { border-top: 2px solid #dee2e6; border-bottom: none; }
  .macro-table tr.dim td { color: #adb5bd; }
  .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0; }

  /* ── Tabs ─────────────────────────────────────────────────────────────── */
  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .tabs button {
    padding: 0.4rem 0.9rem;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;
    font-size: 0.85rem;
    color: #495057;
    font-family: inherit;
    transition: border-color 0.15s, background 0.15s;
  }
  .tabs button.active {
    background: #228be6;
    border-color: #228be6;
    color: #fff;
    font-weight: 600;
  }

  /* ── Meal table ───────────────────────────────────────────────────────── */
  .meal-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  .meal-table th {
    text-align: right;
    padding: 0.5rem 0.75rem;
    border-bottom: 2px solid #dee2e6;
    font-size: 0.75rem;
    color: #868e96;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .meal-table th:first-child { text-align: left; }
  .meal-table td {
    padding: 0.55rem 0.75rem;
    border-bottom: 1px solid #f1f3f5;
    text-align: right;
    color: #495057;
  }
  .meal-table td.meal-label { text-align: left; font-weight: 600; color: #212529; }
  .meal-table td.kcal-cell  { color: #868e96; font-size: 0.8rem; }
  .meal-table tfoot td {
    border-top: 2px solid #dee2e6;
    border-bottom: none;
    padding-top: 0.65rem;
  }
  .meal-table tfoot td.kcal-cell { color: #495057; font-size: 0.875rem; }

  .note {
    margin-top: 0.75rem;
    font-size: 0.75rem;
    color: #868e96;
    line-height: 1.5;
  }
</style>
