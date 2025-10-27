import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

interface AddSupplierDialogProps {
  onSupplierAdded: (data: {
    name: string;
    phone: string;
    pix_key?: string;
    payment_type: "prepaid" | "per_use";
    notes?: string;
  }) => Promise<boolean>;
}

export const AddSupplierDialog = ({ onSupplierAdded }: AddSupplierDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    pix_key: "",
    payment_type: "per_use" as "prepaid" | "per_use",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      return;
    }

    const success = await onSupplierAdded(formData);
    
    if (success) {
      setFormData({
        name: "",
        phone: "",
        pix_key: "",
        payment_type: "per_use",
        notes: "",
      });
      setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Fornecedor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Fornecedor</DialogTitle>
          <DialogDescription>
            Cadastre um novo fornecedor de milhas
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Fornecedor *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: Maria Silva"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone (WhatsApp) *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: formatPhone(e.target.value) })
              }
              placeholder="(11) 99999-9999"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pix_key">Chave PIX</Label>
            <Input
              id="pix_key"
              value={formData.pix_key}
              onChange={(e) =>
                setFormData({ ...formData, pix_key: e.target.value })
              }
              placeholder="CPF, e-mail ou telefone"
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
                <RadioGroupItem value="prepaid" id="prepaid" />
                <Label htmlFor="prepaid" className="font-normal cursor-pointer">
                  Antecipado (compra de milhas)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="per_use" id="per_use" />
                <Label htmlFor="per_use" className="font-normal cursor-pointer">
                  Por uso (paga conforme usa)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Anotações sobre o fornecedor..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Criar Fornecedor</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
