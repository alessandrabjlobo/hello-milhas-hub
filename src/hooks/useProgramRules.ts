// Regras guardadas em localStorage por (scope -> airlineId)
// scope = supplierId atual (quando houver) ou "global".
// Estrutura no localStorage:
// { [scope: string]: { [airlineId: string]: { cpf_limit: number, period: "mes" | "dia" } } }

import { useEffect, useState } from "react";

export type Rule = { cpf_limit: number; period: "mes" | "dia" };
type RulesBlob = Record<string, Record<string, Rule>>;

const LS_KEY = "hmh:program_rules";

function readFromLS(): RulesBlob {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeToLS(v: RulesBlob) {
  localStorage.setItem(LS_KEY, JSON.stringify(v));
}

export function useProgramRules(scope: string) {
  const [blob, setBlob] = useState<RulesBlob>(() => readFromLS());

  // sincroniza entre abas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) setBlob(readFromLS());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const getRule = (airlineId: string): Rule | null => {
    const bucket = blob[scope] || {};
    return bucket[airlineId] || null;
  };

  const setRule = (airlineId: string, rule: Rule) => {
    setBlob(prev => {
      const next = { ...prev };
      const bucket = { ...(next[scope] || {}) };
      bucket[airlineId] = rule;
      next[scope] = bucket;
      writeToLS(next);
      return next;
    });
  };

  const deleteRule = (airlineId: string) => {
    setBlob(prev => {
      const next = { ...prev };
      const bucket = { ...(next[scope] || {}) };
      delete bucket[airlineId];
      next[scope] = bucket;
      writeToLS(next);
      return next;
    });
  };

  // lista amigável pra UI
  const list = Object.entries(blob[scope] || {}).map(([airlineId, rule]) => ({
    airlineId,
    ...rule,
  }));

  return { getRule, setRule, deleteRule, list };
}
