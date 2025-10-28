import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: "insert" | "update" | "delete";
  changed_by: string;
  changed_at: string;
  diff: any;
  supplier_id: string | null;
}

export const useAuditLogs = (recordId?: string, tableName?: string) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("changed_at", { ascending: false });

      if (recordId) {
        query = query.eq("record_id", recordId);
      }

      if (tableName) {
        query = query.eq("table_name", tableName);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAuditLogs((data as AuditLog[]) || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar histórico",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [recordId, tableName]);

  return {
    auditLogs,
    loading,
    refresh: fetchAuditLogs,
  };
};
