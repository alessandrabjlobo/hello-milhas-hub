import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSupplierId } from "@/lib/getSupplierId";

export interface PaymentMethod {
  id: string;
  supplier_id: string;
  method_name: string;
  method_type: string;
  description?: string;
  additional_info: any;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const usePaymentMethods = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMethods = async () => {
    try {
      const { supplierId } = await getSupplierId();

      const { data, error } = await supabase
        .from("payment_methods_config")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setMethods(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar formas de pagamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createMethod = async (methodData: Omit<PaymentMethod, "id" | "created_at" | "updated_at" | "supplier_id">) => {
    try {
      const { supplierId } = await getSupplierId();

      const { error } = await supabase
        .from("payment_methods_config")
        .insert({
          ...methodData,
          supplier_id: supplierId,
        });

      if (error) throw error;

      toast({
        title: "Forma de pagamento criada!",
        description: `${methodData.method_name} foi adicionada.`,
      });

      await fetchMethods();
    } catch (error: any) {
      toast({
        title: "Erro ao criar forma de pagamento",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateMethod = async (id: string, updates: Partial<PaymentMethod>) => {
    try {
      const { error } = await supabase
        .from("payment_methods_config")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Forma de pagamento atualizada!",
      });

      await fetchMethods();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar forma de pagamento",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteMethod = async (id: string) => {
    try {
      const { error } = await supabase
        .from("payment_methods_config")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Forma de pagamento excluída!",
      });

      await fetchMethods();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir forma de pagamento",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  return {
    methods,
    activeMethods: methods.filter(m => m.is_active),
    loading,
    fetchMethods,
    createMethod,
    updateMethod,
    deleteMethod,
  };
};
