import { writable } from "svelte/store";

export interface NutrientDef {
  key: string;
  label: string;     // short label for chart axes
  labelFull: string; // full Italian name for settings/legend
  unita: string;
  defaultTarget: number;
}

export const VITAMINE_DEF: NutrientDef[] = [
  { key: "vitamin_a_rae",               label: "Vit.A",  labelFull: "Vitamina A (RAE)",  unita: "mcg", defaultTarget: 900   },
  { key: "vitamin_c",                   label: "Vit.C",  labelFull: "Vitamina C",         unita: "mg",  defaultTarget: 90    },
  { key: "vitamin_d",                   label: "Vit.D",  labelFull: "Vitamina D",         unita: "mcg", defaultTarget: 15    },
  { key: "vitamin_e_alpha_tocopherol",  label: "Vit.E",  labelFull: "Vitamina E",         unita: "mg",  defaultTarget: 13    },
  { key: "thiamin",                     label: "B1",     labelFull: "Tiamina (B1)",       unita: "mg",  defaultTarget: 1.2   },
  { key: "riboflavin",                  label: "B2",     labelFull: "Riboflavina (B2)",   unita: "mg",  defaultTarget: 1.6   },
  { key: "niacin",                      label: "B3",     labelFull: "Niacina (B3)",       unita: "mg",  defaultTarget: 16    },
  { key: "vitamin_b6",                  label: "B6",     labelFull: "Vitamina B6",        unita: "mg",  defaultTarget: 1.7   },
  { key: "folate_dfe",                  label: "B9",     labelFull: "Folato (B9)",        unita: "mcg", defaultTarget: 400   },
  { key: "vitamin_b12",                 label: "B12",    labelFull: "Vitamina B12",       unita: "mcg", defaultTarget: 4     },
  { key: "vitamin_k",                   label: "Vit.K",  labelFull: "Vitamina K",         unita: "mcg", defaultTarget: 70    },
  { key: "choline",                     label: "Colina", labelFull: "Colina",             unita: "mg",  defaultTarget: 550   },
];

export const MINERALI_DEF: NutrientDef[] = [
  { key: "calcium",    label: "Ca", labelFull: "Calcio",   unita: "mg",  defaultTarget: 1000  },
  { key: "iron",       label: "Fe", labelFull: "Ferro",    unita: "mg",  defaultTarget: 10    },
  { key: "magnesium",  label: "Mg", labelFull: "Magnesio", unita: "mg",  defaultTarget: 350   },
  { key: "phosphorus", label: "P",  labelFull: "Fosforo",  unita: "mg",  defaultTarget: 700   },
  { key: "potassium",  label: "K",  labelFull: "Potassio", unita: "mg",  defaultTarget: 3500  },
  { key: "selenium",   label: "Se", labelFull: "Selenio",  unita: "mcg", defaultTarget: 70    },
  { key: "zinc",       label: "Zn", labelFull: "Zinco",    unita: "mg",  defaultTarget: 11    },
  { key: "copper",     label: "Cu", labelFull: "Rame",     unita: "mg",  defaultTarget: 1.5   },
];

export interface OmegaTargets {
  omega3: number; // g/day  (default 2g — ALA + EPA/DHA)
  omega6: number; // g/day  (default 10g — linoleic acid)
}

export interface SettingsState {
  vitamine: Record<string, number>;
  minerali: Record<string, number>;
  omega: OmegaTargets;
}

function defaultTargets(): SettingsState {
  return {
    vitamine: Object.fromEntries(VITAMINE_DEF.map((d) => [d.key, d.defaultTarget])),
    minerali: Object.fromEntries(MINERALI_DEF.map((d) => [d.key, d.defaultTarget])),
    omega: { omega3: 2, omega6: 10 },
  };
}

const STORAGE_KEY = "dietplanner_settings_v1";

function loadFromStorage(): SettingsState {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SettingsState>;
      const defaults = defaultTargets();
      return {
        vitamine: { ...defaults.vitamine, ...(parsed.vitamine ?? {}) },
        minerali: { ...defaults.minerali, ...(parsed.minerali ?? {}) },
        omega: { ...defaults.omega, ...(parsed.omega ?? {}) },
      };
    }
  } catch {}
  return defaultTargets();
}

function persist(state: SettingsState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function createSettingsStore() {
  const { subscribe, set, update } = writable<SettingsState>(loadFromStorage());

  return {
    subscribe,
    setTarget(group: "vitamine" | "minerali", key: string, value: number) {
      update((s) => {
        const next = { ...s, [group]: { ...s[group], [key]: value } };
        persist(next);
        return next;
      });
    },
    setOmegaTarget(key: "omega3" | "omega6", value: number) {
      update((s) => {
        const next = { ...s, omega: { ...s.omega, [key]: value } };
        persist(next);
        return next;
      });
    },
    reset() {
      const d = defaultTargets();
      set(d);
      persist(d);
    },
  };
}

export const settingsStore = createSettingsStore();
