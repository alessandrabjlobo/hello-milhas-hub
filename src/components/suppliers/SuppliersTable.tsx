import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, Phone, Users } from "lucide-react";
import { useSuppliers, Supplier } from "@/hooks/useSuppliers";
import { useMileageAccounts } from "@/hooks/useMileageAccounts";
import { AddSupplierDialog } from "./AddSupplierDialog";
import { EditSupplierDialog } from "./EditSupplierDialog";
import { DeleteSupplierDialog } from "./DeleteSupplierDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const SuppliersTable = () => {
  const { suppliers, loading, createSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const { accounts } = useMileageAccounts();
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [showAccountsDialog, setShowAccountsDialog] = useState<string | null>(null);

  const getLinkedAccountsCount = (supplierId: string) => {
    return accounts.filter((acc) => (acc as any).supplier_id === supplierId).length;
  };

  const getSupplierAccounts = (supplierId: string) => {
    return accounts.filter((acc) => (acc as any).supplier_id === supplierId);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Fornecedores de Milhas</CardTitle>
        <AddSupplierDialog onSupplierAdded={createSupplier} />
      </CardHeader>
      <CardContent>
        {suppliers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Nenhum fornecedor cadastrado ainda.
            </p>
            <AddSupplierDialog onSupplierAdded={createSupplier} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Chave PIX</TableHead>
                <TableHead>Contas</TableHead>
                <TableHead>Tipo de Pagamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => {
                const accountsCount = getLinkedAccountsCount(supplier.id);
                return (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {supplier.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.pix_key || (
                        <span className="text-muted-foreground">Não informada</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAccountsDialog(supplier.id)}
                        disabled={accountsCount === 0}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        {accountsCount}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          supplier.payment_type === "prepaid"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {supplier.payment_type === "prepaid"
                          ? "Antecipado"
                          : "Por uso"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingSupplier(supplier)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingSupplier(supplier)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {showAccountsDialog && (
        <Dialog open={!!showAccountsDialog} onOpenChange={() => setShowAccountsDialog(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Contas de Milhagem</DialogTitle>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Companhia</TableHead>
                  <TableHead>Número da Conta</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getSupplierAccounts(showAccountsDialog).map((account: any) => (
                  <TableRow key={account.id}>
                    <TableCell>{account.airline_companies?.name || "-"}</TableCell>
                    <TableCell className="font-mono">{account.account_number}</TableCell>
                    <TableCell>{(account.balance || 0).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>
                      <Badge variant={account.status === "active" ? "default" : "secondary"}>
                        {account.status === "active" ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>
      )}

      <EditSupplierDialog
        supplier={editingSupplier}
        open={!!editingSupplier}
        onOpenChange={(open) => !open && setEditingSupplier(null)}
        onUpdate={updateSupplier}
      />

      <DeleteSupplierDialog
        open={!!deletingSupplier}
        onOpenChange={(open) => !open && setDeletingSupplier(null)}
        onConfirm={async () => {
          if (deletingSupplier) {
            await deleteSupplier(deletingSupplier.id);
            setDeletingSupplier(null);
          }
        }}
        supplierName={deletingSupplier?.name || ""}
      />
    </Card>
  );
};
