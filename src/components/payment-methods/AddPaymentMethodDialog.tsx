import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";

interface AddPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddPaymentMethodDialog = ({ open, onOpenChange }: AddPaymentMethodDialogProps) => {
  const { createMethod } = usePaymentMethods();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    method_name: "",
    method_type: "pix",
    description: "",
    pix_key: "",
    pix_holder: "",
    bank_name: "",
    bank_agency: "",
    bank_account: "",
    bank_holder: "",
    bank_document: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const additional_info: any = {};
      
      if (formData.method_type === "pix") {
        additional_info.pix_key = formData.pix_key;
        additional_info.pix_holder = formData.pix_holder;
      } else if (["boleto", "transfer"].includes(formData.method_type)) {
        additional_info.bank_name = formData.bank_name;
        additional_info.bank_agency = formData.bank_agency;
        additional_info.bank_account = formData.bank_account;
        additional_info.bank_holder = formData.bank_holder;
        additional_info.bank_document = formData.bank_document;
      }

      await createMethod({
        method_name: formData.method_name,
        method_type: formData.method_type,
        description: formData.description,
        additional_info,
        display_order: 0,
        is_active: true,
      });

      onOpenChange(false);
      setFormData({
        method_name: "",
        method_type: "pix",
        description: "",
        pix_key: "",
        pix_holder: "",
        bank_name: "",
        bank_agency: "",
        bank_account: "",
        bank_holder: "",
        bank_document: "",
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adicionar Forma de Pagamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="method_name">Nome *</Label>
                <Input
                  id="method_name"
                  value={formData.method_name}
                  onChange={(e) => setFormData({ ...formData, method_name: e.target.value })}
                  placeholder="Ex: PIX, Cartão de Crédito"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="method_type">Tipo *</Label>
                <Select
                  value={formData.method_type}
                  onValueChange={(value) => setFormData({ ...formData, method_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="credit">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit">Cartão de Débito</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Informações adicionais para o cliente"
                rows={2}
              />
            </div>

            {formData.method_type === "pix" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pix_key">Chave PIX *</Label>
                  <Input
                    id="pix_key"
                    value={formData.pix_key}
                    onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                    placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pix_holder">Titular</Label>
                  <Input
                    id="pix_holder"
                    value={formData.pix_holder}
                    onChange={(e) => setFormData({ ...formData, pix_holder: e.target.value })}
                    placeholder="Nome do titular da conta"
                  />
                </div>
              </>
            )}

            {(formData.method_type === "boleto" || formData.method_type === "transfer") && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Banco *</Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      placeholder="Ex: Banco do Brasil"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_agency">Agência *</Label>
                    <Input
                      id="bank_agency"
                      value={formData.bank_agency}
                      onChange={(e) => setFormData({ ...formData, bank_agency: e.target.value })}
                      placeholder="Ex: 1234"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_account">Conta *</Label>
                    <Input
                      id="bank_account"
                      value={formData.bank_account}
                      onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                      placeholder="Ex: 12345-6"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_holder">Titular *</Label>
                    <Input
                      id="bank_holder"
                      value={formData.bank_holder}
                      onChange={(e) => setFormData({ ...formData, bank_holder: e.target.value })}
                      placeholder="Nome do titular"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_document">CPF/CNPJ</Label>
                  <Input
                    id="bank_document"
                    value={formData.bank_document}
                    onChange={(e) => setFormData({ ...formData, bank_document: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
