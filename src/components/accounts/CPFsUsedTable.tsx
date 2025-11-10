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

interface CPFRegistryEntry {
  id: string;
  full_name: string;
  cpf_encrypted: string;
  usage_count: number;
  last_used_at: string | null;
  status: string;
  blocked_until: string | null;
  created_at: string;
}

interface CPFsUsedTableProps {
  accountId: string;
  cpfLimit: number;
}

export function CPFsUsedTable({ accountId, cpfLimit }: CPFsUsedTableProps) {
  const [cpfs, setCpfs] = useState<CPFRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCPFs();
  }, [accountId]);

  const fetchCPFs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cpf_registry")
        .select("*")
        .eq("airline_company_id", accountId)
        .order("usage_count", { ascending: false });

      if (error) throw error;
      setCpfs(data || []);
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
        <div className="mb-4 text-sm text-muted-foreground">
          {cpfs.length} CPF(s) cadastrado(s) - Limite: {cpfLimit} usos por CPF/ano
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
                <TableHead className="text-center">Zerado?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cpfs.map((cpf) => (
                <TableRow key={cpf.id}>
                  <TableCell className="font-medium">{cpf.full_name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {maskCPF(cpf.cpf_encrypted)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        cpf.usage_count >= cpfLimit ? "destructive" : "default"
                      }
                    >
                      {cpf.usage_count} / {cpfLimit}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {formatDate(cpf.last_used_at)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={cpf.status === "available" ? "default" : "secondary"}
                    >
                      {cpf.status === "available" ? "Disponível" : "Bloqueado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {cpf.usage_count >= cpfLimit && cpf.blocked_until ? (
                      <Badge variant="outline">
                        Até {formatDate(cpf.blocked_until)}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
