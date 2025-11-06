// src/hooks/useUserRole.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type UseUserRoleReturn = {
  supplierId: string | null;
  setSupplierIdLocal: (id: string) => void;
  clearSupplierIdLocal: () => void;
  loading: boolean;
  role?: string | null;
};

const LOCAL_KEY = "hmh:selectedSupplierId";

export function useUserRole(): UseUserRoleReturn {
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const readLocal = () => {
    try {
      const v = localStorage.getItem(LOCAL_KEY) || "";
      return v || null;
    } catch {
      return null;
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // tentar pegar do perfil; se falhar, usar localStorage
      const { data: userData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !userData?.user?.id) {
        setSupplierId(readLocal());
        setRole(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("supplier_id, role")
        .eq("id", userData.user.id)
        .maybeSingle(); // evita erro se não existir

      if (error) {
        // falha REST (ex.: 400 no Lovable)? usar localStorage
        setSupplierId(readLocal());
        setRole(null);
        return;
      }

      const supSupplier = (data?.supplier_id as string | null) ?? null;
      setSupplierId(supSupplier ?? readLocal());
      setRole((data?.role as string | null) ?? null);
    } catch {
      setSupplierId(readLocal());
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setSupplierIdLocal = (id: string) => {
    try {
      localStorage.setItem(LOCAL_KEY, id);
    } catch {}
    setSupplierId(id);
  };

  const clearSupplierIdLocal = () => {
    try {
      localStorage.removeItem(LOCAL_KEY);
    } catch {}
    setSupplierId(null);
  };

  return { supplierId, setSupplierIdLocal, clearSupplierIdLocal, loading, role };
}
