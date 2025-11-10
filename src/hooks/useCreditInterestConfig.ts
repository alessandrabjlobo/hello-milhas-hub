import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSupplierId } from "@/lib/getSupplierId";

export interface CreditInterestConfig {
  id: string;
  supplier_id: string;
  installments: number;
  interest_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useCreditInterestConfig = () => {
  const [configs, setConfigs] = useState<CreditInterestConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const { supplierId } = await getSupplierId();
      
      const { data, error } = await supabase
        .from("credit_interest_config" as any)
        .select("*")
        .eq("supplier_id", supplierId)
        .eq("is_active", true)
        .order("installments", { ascending: true });

      if (error) throw error;
      setConfigs((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar configurações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createConfig = async (data: { installments: number; interest_rate: number }) => {
    try {
      const { supplierId } = await getSupplierId();

      const { error } = await supabase.from("credit_interest_config" as any).insert({
        supplier_id: supplierId,
        installments: data.installments,
        interest_rate: data.interest_rate,
        is_active: true,
      } as any);

      if (error) throw error;

      toast({
        title: "Configuração criada!",
        description: "Taxa de juros configurada com sucesso.",
      });

      await fetchConfigs();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao criar configuração",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const updateConfig = async (id: string, data: { installments?: number; interest_rate?: number }) => {
    try {
      const { error } = await supabase
        .from("credit_interest_config" as any)
        .update(data as any)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Configuração atualizada!",
        description: "Taxa de juros atualizada com sucesso.",
      });

      await fetchConfigs();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar configuração",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteConfig = async (id: string) => {
    try {
      const { error } = await supabase
        .from("credit_interest_config" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Configuração removida",
        description: "Taxa de juros removida com sucesso.",
      });

      await fetchConfigs();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao remover configuração",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const calculateInstallmentValue = (
    totalPrice: number,
    installments: number
  ): { installmentValue: number; finalPrice: number; interestRate: number } => {
    const config = configs.find((c) => c.installments === installments);
    
    if (!config || config.interest_rate === 0) {
      return {
        installmentValue: totalPrice / installments,
        finalPrice: totalPrice,
        interestRate: 0,
      };
    }

    const rate = config.interest_rate / 100;
    const finalPrice = totalPrice * (1 + rate);
    const installmentValue = finalPrice / installments;

    return {
      installmentValue,
      finalPrice,
      interestRate: config.interest_rate,
    };
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  return {
    configs,
    loading,
    fetchConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
    calculateInstallmentValue,
  };
};
