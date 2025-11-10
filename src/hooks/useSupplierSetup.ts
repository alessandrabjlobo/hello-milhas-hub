import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export function useSupplierSetup() {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkSupplierSetup();
  }, []);

  async function checkSupplierSetup() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("supplier_id")
        .eq("id", user.id)
        .single();

      setNeedsSetup(!profile?.supplier_id);
    } catch (error) {
      console.error("Error checking supplier setup:", error);
      setNeedsSetup(true);
    } finally {
      setLoading(false);
    }
  }

  return { needsSetup, loading, recheckSetup: checkSupplierSetup };
}
