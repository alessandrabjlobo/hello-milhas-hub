import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AgencyProgramSetting {
  id: string;
  supplier_id: string | null;
  airline_company_id: string;
  is_active: boolean;
  cpf_limit: number;
  cpf_period: "calendar_year" | "rolling_year";
  created_at: string;
  updated_at: string;
  airline_companies?: {
    id: string;
    name: string;
    code: string;
  };
}

export const useAgencyPrograms = (supplierId: string | null) => {
  const [programs, setPrograms] = useState<AgencyProgramSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("agency_program_settings")
        .select(`
          *,
          airline_companies (
            id,
            name,
            code
          )
        `)
        .eq("supplier_id", supplierId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPrograms((data || []) as AgencyProgramSetting[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar programas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrUpdateProgram = async (
    airlineId: string,
    settings: { cpf_limit: number; cpf_period: "calendar_year" | "rolling_year" }
  ) => {
    try {
      const { error } = await supabase
        .from("agency_program_settings")
        .upsert({
          supplier_id: supplierId,
          airline_company_id: airlineId,
          is_active: true,
          cpf_limit: settings.cpf_limit,
          cpf_period: settings.cpf_period,
        }, {
          onConflict: "supplier_id,airline_company_id"
        });

      if (error) throw error;

      toast({
        title: "Programa salvo!",
        description: "As configurações foram atualizadas.",
      });

      await fetchPrograms();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao salvar programa",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteProgram = async (id: string) => {
    try {
      const { error } = await supabase
        .from("agency_program_settings")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Programa removido",
        description: "A configuração foi excluída.",
      });

      await fetchPrograms();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao remover programa",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    if (supplierId) {
      fetchPrograms();
    } else {
      setPrograms([]);
      setLoading(false);
    }
  }, [supplierId]);

  return {
    programs,
    loading,
    fetchPrograms,
    createOrUpdateProgram,
    deleteProgram,
  };
};