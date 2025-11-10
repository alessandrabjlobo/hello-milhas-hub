import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, TrendingUp, TrendingDown, Download, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMovements } from "@/hooks/useMovements";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { AddMovementDialog } from "@/components/movements/AddMovementDialog";
import { MovementsTable } from "@/components/movements/MovementsTable";
import { AuditLogsTable } from "@/components/audit/AuditLogsTable";
import { AccountSalesTable } from "@/components/accounts/AccountSalesTable";
import { EditAccountDialog } from "@/components/accounts/EditAccountDialog";
import { CPFsUsedTable } from "@/components/accounts/CPFsUsedTable";
import { exportToCSV } from "@/lib/csv-export";

interface AccountDetails {
  id: string;
  account_number: string;
  balance: number;
  cost_per_mile: number;
  status: string;
  cpf_limit: number;
  cpf_count: number;
  account_holder_name: string | null;
  airline_companies: {
    name: string;
    code: string;
  } | null;
  suppliers: {
    name: string;
  } | null;
}

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { movements, loading: movementsLoading, fetchMovements } = useMovements(id);
  const { auditLogs, loading: auditLoading } = useAuditLogs(id, "mileage_accounts");

  useEffect(() => {
    if (id) {
      fetchAccountDetails();
    }
  }, [id]);

  const fetchAccountDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("mileage_accounts")
        .select(`
          *,
          airline_companies(name, code),
          suppliers(name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setAccount(data as AccountDetails);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar conta",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleExportMovements = () => {
    const data = movements.map(m => ({
      Data: new Date(m.created_at).toLocaleString("pt-BR"),
      Tipo: m.type === "credit" ? "Crédito" : "Débito",
      Quantidade: m.amount,
      Observação: m.note || "",
    }));
    exportToCSV(data, `movimentacoes_${account?.account_number}_${Date.now()}.csv`);
  };

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!account) return null;

  const totalCredits = movements
    .filter(m => m.type === "credit")
    .reduce((sum, m) => sum + Number(m.amount), 0);
  
  const totalDebits = movements
    .filter(m => m.type === "debit")
    .reduce((sum, m) => sum + Number(m.amount), 0);

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{account.airline_companies?.name}</h1>
          <p className="text-muted-foreground">Conta: {account.account_number}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={account.status === "active" ? "default" : "secondary"}>
            {account.status === "active" ? "Ativa" : "Inativa"}
          </Badge>
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar Conta
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{account.balance.toLocaleString("pt-BR")} milhas</div>
            <p className="text-xs text-muted-foreground mt-1">
              Custo Milheiro: R$ {(account.cost_per_mile * 1000).toFixed(2)}/mil
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Total Créditos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{totalCredits.toLocaleString("pt-BR")} milhas
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {movements.filter(m => m.type === "credit").length} movimentações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Total Débitos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{totalDebits.toLocaleString("pt-BR")} milhas
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {movements.filter(m => m.type === "debit").length} movimentações
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="cpfs">CPFs</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fornecedor</p>
                  <p className="font-medium">{account.suppliers?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Titular</p>
                  <p className="font-medium">{account.account_holder_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CPFs Utilizados</p>
                  <p className="font-medium">{account.cpf_count} / {account.cpf_limit}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Código Companhia</p>
                  <p className="font-medium">{account.airline_companies?.code || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Movimentações</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportMovements}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <AddMovementDialog accountId={id!} onMovementAdded={fetchMovements} />
            </div>
          </div>
          <MovementsTable movements={movements} loading={movementsLoading} />
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <h3 className="text-lg font-semibold">Vendas Utilizando Esta Conta</h3>
          <AccountSalesTable accountId={id!} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <h3 className="text-lg font-semibold">Histórico de Alterações</h3>
          <AuditLogsTable logs={auditLogs} loading={auditLoading} />
        </TabsContent>

        {/* FASE 2: Aba de CPFs Utilizados */}
        <TabsContent value="cpfs" className="space-y-4">
          <h3 className="text-lg font-semibold">CPFs Cadastrados Nesta Conta</h3>
          <CPFsUsedTable accountId={id!} cpfLimit={account.cpf_limit} />
        </TabsContent>
      </Tabs>

      {account && (
        <EditAccountDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          account={{
            id: account.id,
            account_number: account.account_number,
            balance: account.balance,
            cost_per_mile: account.cost_per_mile,
            status: account.status as "active" | "inactive",
            cpf_limit: account.cpf_limit,
            account_holder_name: account.account_holder_name,
            user_id: '',
            airline_company_id: '',
            created_at: '',
            updated_at: '',
          }}
          onUpdate={async () => {
            await fetchAccountDetails();
            return true;
          }}
        />
      )}
    </div>
  );
}
