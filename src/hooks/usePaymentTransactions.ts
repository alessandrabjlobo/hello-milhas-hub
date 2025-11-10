import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaymentTransaction {
  id: string;
  sale_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export const usePaymentTransactions = (saleId?: string) => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTransactions = async () => {
    if (!saleId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("sale_id", saleId)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar pagamentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTransaction = async (transactionData: {
    sale_id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    notes?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("payment_transactions")
        .insert({
          ...transactionData,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Pagamento registrado!",
        description: `R$ ${transactionData.amount.toFixed(2)} foi registrado.`,
      });

      await fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar pagamento",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [saleId]);

  return {
    transactions,
    loading,
    fetchTransactions,
    createTransaction,
  };
};
