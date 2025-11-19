import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AirlineCompany {
  id: string;
  name: string;
  code: string;
}

interface SupplierAirline {
  supplier_id: string;
  airline_company_id: string;
  airline_companies: AirlineCompany;
}

export const useSupplierAirlines = (supplierId: string | null) => {
  const [linkedAirlines, setLinkedAirlines] = useState<AirlineCompany[]>([]);
  const [allAirlines, setAllAirlines] = useState<AirlineCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Buscar todas as companhias aéreas
      const { data: airlinesData, error: airlinesError } = await supabase
        .from("airline_companies")
        .select("*")
        .order("name");

      if (airlinesError) throw airlinesError;
      setAllAirlines(airlinesData || []);

      // Se não tiver supplierId, limpa as vinculadas e encerra
      if (!supplierId) {
        setLinkedAirlines([]);
        return;
      }

      // Buscar companhias vinculadas ao fornecedor
      const { data: linkedData, error: linkedError } = await supabase
        .from("suppliers_airlines")
        .select("airline_company_id, airline_companies(id, name, code)")
        .eq("supplier_id", supplierId);

      if (linkedError) throw linkedError;

      const airlines = (linkedData || [])
        .map((item: SupplierAirline) => item.airline_companies)
        .filter(Boolean);

      setLinkedAirlines(airlines);
    } catch (error: any) {
      console.error("[useSupplierAirlines] Error fetching data:", error);
      toast({
        title: "Erro ao carregar companhias aéreas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [supplierId, toast]);

  const linkAirline = async (airlineId: string) => {
    if (!supplierId) return false;

    try {
      const { error } = await supabase.from("suppliers_airlines").insert({
        supplier_id: supplierId,
        airline_company_id: airlineId,
      });

      if (error) throw error;

      toast({
        title: "Companhia vinculada",
        description: "A companhia aérea foi vinculada com sucesso.",
      });

      await fetchData();
      return true;
    } catch (error: any) {
      console.error("[useSupplierAirlines] Error linking airline:", error);
      toast({
        title: "Erro ao vincular companhia",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const unlinkAirline = async (airlineId: string) => {
    if (!supplierId) return false;

    try {
      const { error } = await supabase
        .from("suppliers_airlines")
        .delete()
        .eq("supplier_id", supplierId)
        .eq("airline_company_id", airlineId);

      if (error) throw error;

      toast({
        title: "Companhia desvinculada",
        description: "A companhia aérea foi desvinculada com sucesso.",
      });

      await fetchData();
      return true;
    } catch (error: any) {
      console.error("[useSupplierAirlines] Error unlinking airline:", error);
      toast({
        title: "Erro ao desvincular companhia",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    linkedAirlines,
    allAirlines,
    loading,
    linkAirline,
    unlinkAirline,
    refresh: fetchData,
  };
};
