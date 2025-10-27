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
import { Pencil, Trash2, Phone } from "lucide-react";
import { useSuppliers, Supplier } from "@/hooks/useSuppliers";
import { AddSupplierDialog } from "./AddSupplierDialog";
import { EditSupplierDialog } from "./EditSupplierDialog";
import { DeleteSupplierDialog } from "./DeleteSupplierDialog";

export const SuppliersTable = () => {
  const { suppliers, loading, createSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

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
                <TableHead>Tipo de Pagamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
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
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

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
