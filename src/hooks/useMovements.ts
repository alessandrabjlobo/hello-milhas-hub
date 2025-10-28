import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Movement {
  id: string;
  account_id: string;
  type: "credit" | "debit";
  amount: number;
  note: string | null;
  created_by: string;
  created_at: string;
}

export const useMovements = (accountId?: string) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMovements = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("mileage_movements")
        .select("*")
        .order("created_at", { ascending: false });

      if (accountId) {
        query = query.eq("account_id", accountId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMovements((data as Movement[]) || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar movimentações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createMovement = async (movementData: {
    account_id: string;
    type: "credit" | "debit";
    amount: number;
    note?: string;
  }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("mileage_movements").insert({
        ...movementData,
        created_by: userData.user.id,
      });

      if (error) throw error;

      toast({
        title: "Movimentação criada",
        description: "A movimentação foi registrada com sucesso.",
      });

      await fetchMovements();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao criar movimentação",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteMovement = async (id: string) => {
    try {
      const { error } = await supabase
        .from("mileage_movements")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Movimentação removida",
        description: "A movimentação foi excluída com sucesso.",
      });

      await fetchMovements();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao remover movimentação",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [accountId]);

  return {
    movements,
    loading,
    fetchMovements,
    createMovement,
    deleteMovement,
  };
};
