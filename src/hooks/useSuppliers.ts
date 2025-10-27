import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  pix_key?: string;
  payment_type: "prepaid" | "per_use";
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSuppliers((data as Supplier[]) || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar fornecedores",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSupplier = async (supplierData: {
    name: string;
    phone: string;
    pix_key?: string;
    payment_type: "prepaid" | "per_use";
    notes?: string;
  }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("suppliers").insert({
        ...supplierData,
        user_id: userData.user.id,
      });

      if (error) throw error;

      toast({
        title: "Fornecedor criado!",
        description: "O fornecedor foi cadastrado com sucesso.",
      });

      await fetchSuppliers();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao criar fornecedor",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const updateSupplier = async (
    id: string,
    updates: Partial<Supplier>
  ) => {
    try {
      const { error } = await supabase
        .from("suppliers")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Fornecedor atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });

      await fetchSuppliers();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar fornecedor",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Fornecedor removido",
        description: "O fornecedor foi excluído com sucesso.",
      });

      await fetchSuppliers();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao remover fornecedor",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  return {
    suppliers,
    loading,
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  };
};
