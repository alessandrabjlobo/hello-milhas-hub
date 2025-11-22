import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];
type TicketInsert = Database["public"]["Tables"]["tickets"]["Insert"];
type TicketUpdate = Database["public"]["Tables"]["tickets"]["Update"];

export interface Ticket extends TicketRow {
  sales?: {
    customer_name: string | null;
    route_text: string | null;
    mileage_accounts?: {
      airline_companies: {
        name: string;
        code: string;
      } | null;
    } | null;
  } | null;
}

export const useTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTickets = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          sales (
            customer_name,
            route_text,
            mileage_accounts (
              airline_companies (
                name,
                code
              )
            )
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTickets((data || []) as Ticket[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar passagens",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (ticketData: TicketInsert) => {
    try {
      const { error } = await supabase.from("tickets").insert(ticketData);

      if (error) throw error;

      toast({
        title: "Passagem registrada!",
        description: "A emissão foi registrada com sucesso.",
      });

      await fetchTickets();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao registrar passagem",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const updateTicket = async (id: string, updates: TicketUpdate) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Passagem atualizada!",
        description: "As alterações foram salvas.",
      });

      await fetchTickets();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar passagem",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteTicket = async (id: string) => {
    try {
      const { error } = await supabase.from("tickets").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Passagem removida",
        description: "A passagem foi excluída.",
      });

      await fetchTickets();
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao remover passagem",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return {
    tickets,
    loading,
    fetchTickets,
    createTicket,
    updateTicket,
    deleteTicket,
  };
};
