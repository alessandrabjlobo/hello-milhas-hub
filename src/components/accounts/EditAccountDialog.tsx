import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MileageAccount } from "@/hooks/useMileageAccounts";
import { applyCPFMask, applyNumericMask } from "@/lib/input-masks";

interface EditAccountDialogProps {
  account: MileageAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<MileageAccount>) => Promise<boolean>;
}

export const EditAccountDialog = ({
  account,
  open,
  onOpenChange,
  onUpdate,
}: EditAccountDialogProps) => {
  const [formData, setFormData] = useState({
    account_number: "",
    balance: "",
    cost_per_mile: "",
    status: "active" as "active" | "inactive",
    account_holder_name: "",
    account_holder_cpf: "",
    cpf_limit: "",
  });

  useEffect(() => {
    if (account) {
      setFormData({
        account_number: account.account_number,
        balance: account.balance.toString(),
        cost_per_mile: account.cost_per_mile.toString(),
        status: account.status,
        account_holder_name: account.account_holder_name || "",
        account_holder_cpf: account.account_holder_cpf || "",
        cpf_limit: account.cpf_limit?.toString() || "25",
      });
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    const success = await onUpdate(account.id, {
      account_number: formData.account_number,
      balance: parseInt(formData.balance),
      cost_per_mile: parseFloat(formData.cost_per_mile),
      status: formData.status,
      account_holder_name: formData.account_holder_name || null,
      account_holder_cpf: formData.account_holder_cpf || null,
      cpf_limit: parseInt(formData.cpf_limit) || 25,
    });

    if (success) {
      onOpenChange(false);
    }
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Conta de Milhagem</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Programa</Label>
            <Input
              value={account.airline_companies?.name || ""}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_account_number">Número da Conta</Label>
            <Input
              id="edit_account_number"
              value={formData.account_number}
              onChange={(e) =>
                setFormData({ ...formData, account_number: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_balance">Saldo (milhas)</Label>
            <Input
              id="edit_balance"
              type="number"
              value={formData.balance}
              onChange={(e) =>
                setFormData({ ...formData, balance: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_cost_per_mile">Custo por Milha (R$)</Label>
            <Input
              id="edit_cost_per_mile"
              type="number"
              step="0.001"
              value={formData.cost_per_mile}
              onChange={(e) =>
                setFormData({ ...formData, cost_per_mile: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_holder_name">Titular da Conta</Label>
            <Input
              id="edit_holder_name"
              value={formData.account_holder_name}
              onChange={(e) =>
                setFormData({ ...formData, account_holder_name: e.target.value })
              }
              placeholder="Nome do titular"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_holder_cpf">CPF do Titular</Label>
            <Input
              id="edit_holder_cpf"
              value={formData.account_holder_cpf}
              onChange={(e) =>
                setFormData({ ...formData, account_holder_cpf: applyCPFMask(e.target.value) })
              }
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_cpf_limit">Limite de CPFs</Label>
            <Input
              id="edit_cpf_limit"
              type="number"
              min="1"
              value={formData.cpf_limit}
              onChange={(e) =>
                setFormData({ ...formData, cpf_limit: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "active" | "inactive") =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="inactive">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
