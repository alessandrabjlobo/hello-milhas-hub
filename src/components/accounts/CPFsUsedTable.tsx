import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { Users } from "lucide-react";
import { AddCPFDialog } from "./AddCPFDialog";

interface CPFRegistryEntry {
  id: string;
  full_name: string;
  cpf_encrypted: string;
  usage_count: number;
  last_used_at: string | null;
  status: string;
  blocked_until: string | null;
  created_at: string;
  computed_status?: string;
  renewal_near?: boolean;
  first_use_date?: string | null;
}

interface ProgramRule {
  cpf_limit: number;
  renewal_type: string;
}

interface CPFsUsedTableProps {
  accountId: string;
  cpfLimit: number;
}

export function CPFsUsedTable({ accountId, cpfLimit }: CPFsUsedTableProps) {
  const [cpfs, setCpfs] = useState<CPFRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [airlineCompanyId, setAirlineCompanyId] = useState<string>("");
  const [programRule, setProgramRule] = useState<ProgramRule | null>(null);

  useEffect(() => {
    fetchAccountAndCPFs();
  }, [accountId]);

  const fetchAccountAndCPFs = async () => {
    try {
      setLoading(true);
      
      // Buscar airline_company_id e supplier_id da conta
      const { data: accountData } = await supabase
        .from("mileage_accounts")
        .select("airline_company_id, supplier_id")
        .eq("id", accountId)
        .single();
      
      if (accountData) {
        setAirlineCompanyId(accountData.airline_company_id);
        
        // Buscar regra do programa para esta companhia aérea
        const { data: ruleData } = await supabase
          .from("program_rules")
          .select("cpf_limit, renewal_type")
          .eq("airline_id", accountData.airline_company_id)
          .eq("supplier_id", accountData.supplier_id)
          .maybeSingle();
        
        setProgramRule(ruleData || { cpf_limit: cpfLimit, renewal_type: "annual" });
        
        // Buscar CPFs usando a view com status computado
        const { data, error } = await supabase
          .from("cpf_registry_with_status")
          .select("*")
          .eq("airline_company_id", accountData.airline_company_id)
          .order("usage_count", { ascending: false });

        if (error) throw error;
        setCpfs(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch CPFs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const maskCPF = (cpf: string) => {
    return `***.***.***-${cpf.slice(-2)}`;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (cpfs.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={Users}
            title="Nenhum CPF cadastrado"
            description="Os CPFs serão registrados automaticamente quando forem utilizados em vendas."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">
              {cpfs.length} CPF(s) cadastrado(s) - Limite: {programRule?.cpf_limit || cpfLimit} usos por CPF
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {programRule?.renewal_type === "rolling" ? "Renovação Contínua (1 ano do 1º uso)" : "Renovação Anual (1º Janeiro)"}
              </Badge>
            </div>
          </div>
          {airlineCompanyId && (
            <AddCPFDialog
              accountId={accountId}
              airlineCompanyId={airlineCompanyId}
              onSuccess={fetchAccountAndCPFs}
            />
          )}
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead className="text-center">Usos</TableHead>
                <TableHead className="text-center">Último Uso</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Disponível Em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cpfs.map((cpf) => {
                const effectiveLimit = programRule?.cpf_limit || cpfLimit;
                const isBlocked = (cpf.computed_status || cpf.status) === "blocked";
                
                return (
                  <TableRow key={cpf.id}>
                    <TableCell className="font-medium">{cpf.full_name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {maskCPF(cpf.cpf_encrypted)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          cpf.usage_count >= effectiveLimit ? "destructive" : "default"
                        }
                      >
                        {cpf.usage_count} / {effectiveLimit}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {formatDate(cpf.last_used_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={!isBlocked ? "default" : "secondary"}
                      >
                        {!isBlocked ? "Disponível" : "Bloqueado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {cpf.blocked_until ? (
                        <div className="flex items-center justify-center gap-1">
                          <Badge variant={cpf.renewal_near ? "default" : "outline"}>
                            {formatDate(cpf.blocked_until)}
                          </Badge>
                          {cpf.renewal_near && (
                            <Badge variant="secondary" className="text-xs">
                              Em breve
                            </Badge>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
