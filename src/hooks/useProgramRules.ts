// Regras guardadas em localStorage por (supplierId | "global") + airlineId
// Estrutura: { [scope]: { [airlineId]: { cpf_limit: number, period: "mes" | "dia" } } }

import { useEffect, useState } from "react";

type Rule = { cpf_limit: number; period: "mes" | "dia" };
type Rules = Record<string, Record<string, Rule>>;

const LS_KEY = "hmh:program_rules";

function read(): Rules {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function write(v: Rules) {
  localStorage.setItem(LS_KEY, JSON.stringify(v));
}

export function useProgramRules(scope: string) {
  // scope = supplierId ou "global"
  const [rules, setRules] = useState<Rules>(() => read());

  useEffect(() => {
    // sincroniza múltiplas abas
    const handler = (e: StorageEvent) => {
      if (e.key === LS_KEY) setRules(read());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const getRule = (airlineId: string): Rule | null => {
    const rScope = rules[scope] || {};
    return rScope[airlineId] || null;
  };

  const setRule = (airlineId: string, rule: Rule) => {
    setRules(prev => {
      const next = { ...prev };
      const bucket = { ...(next[scope] || {}) };
      bucket[airlineId] = rule;
      next[scope] = bucket;
      write(next);
      return next;
    });
  };

  const deleteRule = (airlineId: string) => {
    setRules(prev => {
      const next = { ...prev };
      const bucket = { ...(next[scope] || {}) };
      delete bucket[airlineId];
      next[scope] = bucket;
      write(next);
      return next;
    });
  };

  // lista para UI
  const list = Object.entries(rules[scope] || {}).map(([airlineId, rule]) => ({
    airlineId, ...rule,
  }));

  return { getRule, setRule, deleteRule, list };
}
