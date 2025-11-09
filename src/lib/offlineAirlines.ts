// src/lib/offlineAirlines.ts
export type RenewalType = "annual" | "rolling";

export type OfflineAirline = {
  id: string;
  name: string;
  code: string;
  cpf_limit?: number;
  renewal_type?: RenewalType;
};

const AIRLINES_KEY = "hm_offline_airlines_v1";

function readAll(): OfflineAirline[] {
  try {
    const raw = localStorage.getItem(AIRLINES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(list: OfflineAirline[]) {
  localStorage.setItem(AIRLINES_KEY, JSON.stringify(list));
}

export const offlineAirlines = {
  list(): OfflineAirline[] {
    return readAll().sort((a, b) => a.name.localeCompare(b.name));
  },

  create(name: string, code: string): OfflineAirline {
    const id = crypto.randomUUID?.() || `${Date.now()}_${Math.random()}`;
    const next: OfflineAirline = { id, name: name.trim(), code: code.trim().toUpperCase(), cpf_limit: 25, renewal_type: "annual" };
    const all = readAll();
    all.push(next);
    writeAll(all);
    return next;
  },

  updateRule(id: string, cpf_limit: number, renewal_type: RenewalType) {
    const all = readAll();
    const i = all.findIndex(a => a.id === id);
    if (i >= 0) {
      all[i] = { ...all[i], cpf_limit, renewal_type };
      writeAll(all);
    }
  }
};
