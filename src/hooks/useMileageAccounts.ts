import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSupplierId } from "@/lib/getSupplierId";

export interface MileageAccount {
  id: string;
  user_id: string;
  airline_company_id: string;
  account_number: string;
  balance: number;
  cost_per_mile: number;
  status: "active" | "inactive";
  account_holder_name?: string | null;
  account_holder_cpf?: string | null;
  cpf_limit?: number;
  cpf_count?: number;
  created_at: string;
  updated_at: string;
  airline_companies?: {
    name: string;
    code: string;
  };
  supplier?: {
    id: string;
    name: string;
  };
}

export const useMileageAccounts = () => {
  const [accounts, setAccounts] = useState<MileageAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      // Ensure profile and supplier are provisioned for the authenticated user
      await getSupplierId().catch(() => {});

      const { data, error } = await supabase
        .from("mileage_accounts")
        .select(`
          id,
          user_id,
          airline_company_id,
          supplier_id,
          account_holder_name,
          account_holder_cpf,
          account_number,
          balance,
          cost_per_mile,
          cpf_limit,
          cpf_count,
          status,
          created_at,
          updated_at,
          airline_companies (
            name,
            code
          ),
          supplier:suppliers!mileage_accounts_supplier_id_fkey (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar contas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async (accountData: {
    airline_company_id: string;
    supplier_id: string;
    account_number: string;
    balance: number;
    cost_per_mile: number;
    status: "active" | "inactive";
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar supplier_id do perfil do usuário
      const { data: profile } = await supabase
        .from("profiles")
        .select("supplier_id")
        .eq("id", user.id)
        .single();

      if (!profile?.supplier_id) {
        throw new Error("Perfil sem supplier_id configurado");
      }

      const { error } = await supabase.from("mileage_accounts").insert({
        ...accountData,
        user_id: user.id,
        supplier_id: profile.supplier_id,
      });

      if (error) throw error;

      toast({
        title: "Conta criada!",
        description: "A conta de milhagem foi cadastrada com sucesso.",
      });

      await fetchAccounts();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const updateAccount = async (
    id: string,
    updates: Partial<MileageAccount>
  ) => {
    try {
      const { error } = await supabase
        .from("mileage_accounts")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Conta atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });

      await fetchAccounts();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar conta",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from("mileage_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Conta removida",
        description: "A conta foi excluída com sucesso.",
      });

      await fetchAccounts();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao remover conta",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  return {
    accounts,
    loading,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
  };
};
