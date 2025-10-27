import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Supplier } from "@/hooks/useSuppliers";

interface EditSupplierDialogProps {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<Supplier>) => Promise<boolean>;
}

export const EditSupplierDialog = ({
  supplier,
  open,
  onOpenChange,
  onUpdate,
}: EditSupplierDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    pix_key: "",
    payment_type: "per_use" as "prepaid" | "per_use",
    notes: "",
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        phone: supplier.phone,
        pix_key: supplier.pix_key || "",
        payment_type: supplier.payment_type,
        notes: supplier.notes || "",
      });
    }
  }, [supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supplier) return;

    const success = await onUpdate(supplier.id, formData);
    
    if (success) {
      onOpenChange(false);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})(\d)/g, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
    }
    return value;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Fornecedor</DialogTitle>
          <DialogDescription>
            Atualize as informações do fornecedor
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome do Fornecedor *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone">Telefone (WhatsApp) *</Label>
            <Input
              id="edit-phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: formatPhone(e.target.value) })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-pix">Chave PIX</Label>
            <Input
              id="edit-pix"
              value={formData.pix_key}
              onChange={(e) =>
                setFormData({ ...formData, pix_key: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Pagamento *</Label>
            <RadioGroup
              value={formData.payment_type}
              onValueChange={(value: "prepaid" | "per_use") =>
                setFormData({ ...formData, payment_type: value })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="prepaid" id="edit-prepaid" />
                <Label htmlFor="edit-prepaid" className="font-normal cursor-pointer">
                  Antecipado (compra de milhas)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="per_use" id="edit-per-use" />
                <Label htmlFor="edit-per-use" className="font-normal cursor-pointer">
                  Por uso (paga conforme usa)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Observações</Label>
            <Textarea
              id="edit-notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Salvar Alterações</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
