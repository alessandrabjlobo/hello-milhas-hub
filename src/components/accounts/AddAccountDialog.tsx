import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AirlineCompany {
  id: string;
  name: string;
  code: string;
}

interface AddAccountDialogProps {
  onAccountAdded: () => void;
}

export const AddAccountDialog = ({ onAccountAdded }: AddAccountDialogProps) => {
  const [open, setOpen] = useState(false);
  const [airlines, setAirlines] = useState<AirlineCompany[]>([]);
  const [formData, setFormData] = useState({
    airline_company_id: "",
    account_number: "",
    balance: "",
    cost_per_mile: "",
    status: "active" as "active" | "inactive",
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchAirlines = async () => {
      const { data } = await supabase
        .from("airline_companies")
        .select("id, name, code")
        .order("name");
      if (data) setAirlines(data);
    };
    fetchAirlines();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.airline_company_id || !formData.account_number) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("mileage_accounts").insert({
        user_id: userData.user.id,
        airline_company_id: formData.airline_company_id,
        account_number: formData.account_number,
        balance: parseInt(formData.balance) || 0,
        cost_per_mile: parseFloat(formData.cost_per_mile) || 0.029,
        status: formData.status,
      });

      if (error) throw error;

      toast({
        title: "Conta criada!",
        description: "A conta de milhagem foi cadastrada com sucesso.",
      });

      setFormData({
        airline_company_id: "",
        account_number: "",
        balance: "",
        cost_per_mile: "",
        status: "active",
      });
      setOpen(false);
      onAccountAdded();
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Conta de Milhagem</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="airline">Programa de Milhagem *</Label>
            <Select
              value={formData.airline_company_id}
              onValueChange={(value) =>
                setFormData({ ...formData, airline_company_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o programa" />
              </SelectTrigger>
              <SelectContent>
                {airlines.map((airline) => (
                  <SelectItem key={airline.id} value={airline.id}>
                    {airline.name} ({airline.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_number">Número da Conta *</Label>
            <Input
              id="account_number"
              placeholder="**** 1234"
              value={formData.account_number}
              onChange={(e) =>
                setFormData({ ...formData, account_number: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">Saldo Inicial (milhas)</Label>
            <Input
              id="balance"
              type="number"
              placeholder="0"
              value={formData.balance}
              onChange={(e) =>
                setFormData({ ...formData, balance: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost_per_mile">Custo por Milha (R$)</Label>
            <Input
              id="cost_per_mile"
              type="number"
              step="0.001"
              placeholder="0.029"
              value={formData.cost_per_mile}
              onChange={(e) =>
                setFormData({ ...formData, cost_per_mile: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Criar Conta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
