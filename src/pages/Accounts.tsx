import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Eye, CreditCard, TrendingUp, AlertTriangle } from "lucide-react";
import { useMileageAccounts } from "@/hooks/useMileageAccounts";
import { AddAccountDialog } from "@/components/accounts/AddAccountDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddMovementDialog } from "@/components/movements/AddMovementDialog";

export default function Accounts() {
  const { accounts, loading, fetchAccounts } = useMileageAccounts();

  const getCPFBadge = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    let variant: "default" | "secondary" | "destructive" = "default";
    
    if (percentage >= 90) variant = "destructive";
    else if (percentage >= 75) variant = "secondary";
    
    return (
      <Badge variant={variant}>
        {used}/{limit}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Card className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Contas de Milhagem</h1>
            <p className="text-muted-foreground">
              {accounts.length} conta(s) cadastrada(s)
            </p>
          </div>
          <AddAccountDialog onAccountAdded={fetchAccounts} />
        </div>

        <Card>
          {accounts.length === 0 ? (
            <>
              <EmptyState
                icon={CreditCard}
                title="Nenhuma conta cadastrada"
                description="Cadastre a primeira conta de milhagem para começar."
              />
              <div className="text-center pb-6">
                <AddAccountDialog onAccountAdded={fetchAccounts} />
              </div>
            </>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Companhia</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Número da Conta</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>CPFs Usados</TableHead>
                  <TableHead>Custo/1k</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {account.airline_companies?.code || "-"}
                        </Badge>
                        <span className="font-medium">
                          {account.airline_companies?.name || "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {account.supplier?.name || "Não informado"}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">
                      {account.account_number?.slice(-4) 
                        ? `****${account.account_number.slice(-4)}`
                        : account.account_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="font-semibold">
                          {(account.balance || 0).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCPFBadge(account.cpf_count || 0, account.cpf_limit || 25)}
                        {((account.cpf_count || 0) / (account.cpf_limit || 25)) >= 0.9 && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      R$ {(account.cost_per_mile * 1000).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.status === "active" ? "default" : "secondary"}>
                        {account.status === "active" ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <AddMovementDialog accountId={account.id} onMovementAdded={fetchAccounts} showLabel />
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/accounts/${account.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalhes
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
