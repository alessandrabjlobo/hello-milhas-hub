// src/hooks/useUserRole.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type UseUserRoleReturn = {
  supplierId: string | null;
  setSupplierIdLocal: (id: string) => void;
  clearSupplierIdLocal: () => void;
  loading: boolean;
  isAdmin: boolean;
};

const LOCAL_KEY = "hmh:selectedSupplierId";

export function useUserRole(): UseUserRoleReturn {
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
      const { data: userData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !userData?.user?.id) {
        setSupplierId(readLocal());
        setIsAdmin(false);
        return;
      }

      // Get supplier_id from profile
      const { data, error } = await supabase
        .from("profiles")
        .select("supplier_id")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (error) {
        setSupplierId(readLocal());
        setIsAdmin(false);
        return;
      }

      // Check admin role using RPC function
      const { data: isAdminData } = await supabase.rpc("is_admin", {
        _user_id: userData.user.id,
      });

      const supSupplier = (data?.supplier_id as string | null) ?? null;
      setSupplierId(supSupplier ?? readLocal());
      setIsAdmin(isAdminData || false);
    } catch {
      setSupplierId(readLocal());
      setIsAdmin(false);
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

  return { supplierId, setSupplierIdLocal, clearSupplierIdLocal, loading, isAdmin };
}
