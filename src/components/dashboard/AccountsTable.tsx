import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2 } from "lucide-react";
import { useMileageAccounts, MileageAccount } from "@/hooks/useMileageAccounts";
import { AddAccountDialog } from "@/components/accounts/AddAccountDialog";
import { EditAccountDialog } from "@/components/accounts/EditAccountDialog";
import { DeleteAccountDialog } from "@/components/accounts/DeleteAccountDialog";

export const AccountsTable = () => {
  const { accounts, loading, fetchAccounts, updateAccount, deleteAccount } =
    useMileageAccounts();
  const [editingAccount, setEditingAccount] = useState<MileageAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<MileageAccount | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Contas de Milhagem</h2>
        <AddAccountDialog onAccountAdded={fetchAccounts} />
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">
            Nenhuma conta cadastrada ainda.
          </p>
          <AddAccountDialog onAccountAdded={fetchAccounts} />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Programa</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Custo/Milha</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">
                  {account.airline_companies?.name || "N/A"}
                </TableCell>
                <TableCell>{account.account_number}</TableCell>
                <TableCell className="font-semibold">
                  {account.balance.toLocaleString("pt-BR")} pts
                </TableCell>
                <TableCell>
                  R$ {account.cost_per_mile.toFixed(3)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={account.status === "active" ? "default" : "secondary"}
                  >
                    {account.status === "active" ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingAccount(account)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingAccount(account)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <EditAccountDialog
        account={editingAccount}
        open={!!editingAccount}
        onOpenChange={(open) => !open && setEditingAccount(null)}
        onUpdate={updateAccount}
      />

      <DeleteAccountDialog
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
        onConfirm={() => {
          if (deletingAccount) {
            deleteAccount(deletingAccount.id);
            setDeletingAccount(null);
          }
        }}
        accountName={deletingAccount?.airline_companies?.name}
      />
    </div>
  );
};
