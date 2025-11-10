import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export type RenewalType = "annual" | "rolling";

interface ProgramRuleFormData {
  airlineId: string;
  cpfLimit: number;
  renewalType: RenewalType;
}

export const useProgramRulesForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = useCallback((data: ProgramRuleFormData): boolean => {
    if (!data.airlineId) {
      toast({
        title: "Erro de validação",
        description: "Selecione uma companhia aérea",
        variant: "destructive",
      });
      return false;
    }

    if (!data.cpfLimit || data.cpfLimit < 1 || data.cpfLimit > 1000) {
      toast({
        title: "Erro de validação",
        description: "Limite de CPF deve estar entre 1 e 1000",
        variant: "destructive",
      });
      return false;
    }

    return true;
  }, [toast]);

  const submitRule = useCallback(async (data: ProgramRuleFormData): Promise<boolean> => {
    if (!validateForm(data)) return false;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("airline_companies")
        .update({
          cpf_limit: data.cpfLimit,
          renewal_type: data.renewalType,
        })
        .eq("id", data.airlineId);

      if (error) throw error;

      toast({
        title: "Regra salva",
        description: "Configuração aplicada com sucesso",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Verifique sua conexão e tente novamente",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, toast]);

  return {
    isSubmitting,
    validateForm,
    submitRule,
  };
};
