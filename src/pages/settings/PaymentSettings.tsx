import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PaymentMethodsList } from "@/components/payment-methods/PaymentMethodsList";
import { AddPaymentMethodDialog } from "@/components/payment-methods/AddPaymentMethodDialog";
import { EditPaymentMethodDialog } from "@/components/payment-methods/EditPaymentMethodDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { usePaymentMethods, PaymentMethod } from "@/hooks/usePaymentMethods";

const PaymentSettings = () => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const { deleteMethod } = usePaymentMethods();

  const handleEdit = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedMethod) {
      await deleteMethod(selectedMethod.id);
      setDeleteDialogOpen(false);
      setSelectedMethod(null);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Formas de Pagamento</h1>
          <p className="text-muted-foreground mt-1">
            Configure as formas de pagamento aceitas pela sua agência
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Forma
        </Button>
      </div>

      <PaymentMethodsList onEdit={handleEdit} onDelete={handleDeleteClick} />

      <AddPaymentMethodDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      <EditPaymentMethodDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        method={selectedMethod}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir forma de pagamento"
        description={`Tem certeza que deseja excluir "${selectedMethod?.method_name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteConfirm}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
      />
    </div>
  );
};

export default PaymentSettings;
