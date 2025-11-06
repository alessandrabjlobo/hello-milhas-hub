// src/hooks/useUserRole.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type UseUserRoleReturn = {
  supplierId: string | null;            // pode vir do perfil OU do localStorage
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;

      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("supplier_id, role")
          .eq("id", uid)
          .single();

        const profileSupplier = profile?.supplier_id ?? null;
        setRole(profile?.role ?? null);

        if (profileSupplier) {
          setSupplierId(profileSupplier);
        } else {
          // fallback: localStorage
          const local = localStorage.getItem(LOCAL_KEY) || "";
          setSupplierId(local || null);
        }
      } else {
        // sem auth -> só localStorage
        const local = localStorage.getItem(LOCAL_KEY) || "";
        setSupplierId(local || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setSupplierIdLocal = (id: string) => {
    localStorage.setItem(LOCAL_KEY, id);
    setSupplierId(id);
  };

  const clearSupplierIdLocal = () => {
    localStorage.removeItem(LOCAL_KEY);
    setSupplierId(null);
  };

  return { supplierId, setSupplierIdLocal, clearSupplierIdLocal, loading, role };
}
