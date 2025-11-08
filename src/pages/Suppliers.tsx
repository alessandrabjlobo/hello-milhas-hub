import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Phone, CreditCard, Link as LinkIcon } from "lucide-react";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useMileageAccounts } from "@/hooks/useMileageAccounts";
import { AddSupplierDialog } from "@/components/suppliers/AddSupplierDialog";
import { EditSupplierDialog } from "@/components/suppliers/EditSupplierDialog";
import { DeleteSupplierDialog } from "@/components/suppliers/DeleteSupplierDialog";
import { EmptyState } from "@/components/shared/EmptyState";

export default function Suppliers() {
  const { suppliers, loading, createSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const { accounts } = useMileageAccounts();

  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<any>(null);

  const getLinkedAccountsCount = (supplierId: string) => {
    return accounts.filter((acc) => (acc as any).supplier_id === supplierId).length;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Fornecedores</h1>
            <p className="text-muted-foreground">
              {suppliers.length} fornecedor(es) cadastrado(s)
            </p>
          </div>
          <AddSupplierDialog onSupplierAdded={createSupplier} />
        </div>

        {suppliers.length === 0 ? (
          <Card>
            <EmptyState
              icon={Building2}
              title="Nenhum fornecedor cadastrado"
              description="Cadastre fornecedores para gerenciar contas de milhagem e pagamentos."
            />
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map((supplier) => (
              <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{supplier.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3" />
                          {supplier.phone}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {supplier.pix_key && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Chave PIX
                        </span>
                        <span className="font-mono text-xs">{supplier.pix_key}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Contas vinculadas
                      </span>
                      <Badge variant="outline">{getLinkedAccountsCount(supplier.id)}</Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tipo de Pagamento</span>
                      <Badge
                        variant={supplier.payment_type === "prepaid" ? "default" : "secondary"}
                      >
                        {supplier.payment_type === "prepaid" ? "Pré-pago" : "Por Uso"}
                      </Badge>
                    </div>
                  </div>

                  {supplier.notes && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground">{supplier.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingSupplier(supplier)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => setDeletingSupplier(supplier)}
                    >
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {editingSupplier && (
        <EditSupplierDialog
          supplier={editingSupplier}
          open={true}
          onOpenChange={(open) => !open && setEditingSupplier(null)}
          onUpdate={updateSupplier}
        />
      )}

      {deletingSupplier && (
        <DeleteSupplierDialog
          open={true}
          onOpenChange={(open) => !open && setDeletingSupplier(null)}
          onConfirm={() => deleteSupplier(deletingSupplier.id)}
          supplierName={deletingSupplier.name}
        />
      )}
    </div>
  );
}
