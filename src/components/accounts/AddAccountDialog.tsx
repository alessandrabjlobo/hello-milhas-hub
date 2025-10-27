import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AirlineCompany {
  id: string;
  name: string;
  code: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface AddAccountDialogProps {
  onAccountAdded: () => void;
}

export const AddAccountDialog = ({ onAccountAdded }: AddAccountDialogProps) => {
  const [open, setOpen] = useState(false);
  const [airlines, setAirlines] = useState<AirlineCompany[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    airline_company_id: "",
    supplier_id: "",
    account_holder_name: "",
    account_holder_cpf: "",
    password: "",
    account_number: "",
    balance: "",
    cost_per_mile: "0.029",
    cpf_limit: "25",
    status: "active" as "active" | "inactive",
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const [airlinesRes, suppliersRes] = await Promise.all([
        supabase.from("airline_companies").select("id, name, code").order("name"),
        supabase.from("suppliers").select("id, name").order("name"),
      ]);

      if (airlinesRes.data) setAirlines(airlinesRes.data);
      if (suppliersRes.data) setSuppliers(suppliersRes.data);
    };
    if (open) fetchData();
  }, [open]);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.airline_company_id ||
      !formData.account_number ||
      !formData.account_holder_name ||
      !formData.account_holder_cpf
    ) {
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

      // Encrypt password if provided
      let passwordEncrypted = null;
      if (formData.password) {
        const { data: encryptedData, error: encryptError } = await supabase.rpc(
          "encrypt_password",
          { password_text: formData.password }
        );
        
        if (encryptError) throw encryptError;
        passwordEncrypted = encryptedData;
      }

      const { error } = await supabase.from("mileage_accounts").insert({
        user_id: userData.user.id,
        airline_company_id: formData.airline_company_id,
        supplier_id: formData.supplier_id || null,
        account_holder_name: formData.account_holder_name,
        account_holder_cpf: formData.account_holder_cpf,
        password_encrypted: passwordEncrypted,
        account_number: formData.account_number,
        balance: parseInt(formData.balance) || 0,
        cost_per_mile: parseFloat(formData.cost_per_mile),
        cpf_limit: parseInt(formData.cpf_limit),
        cpf_count: 0,
        status: formData.status,
      });

      if (error) throw error;

      toast({
        title: "Conta criada!",
        description: "A conta de milhagem foi cadastrada com sucesso.",
      });

      setFormData({
        airline_company_id: "",
        supplier_id: "",
        account_holder_name: "",
        account_holder_cpf: "",
        password: "",
        account_number: "",
        balance: "",
        cost_per_mile: "0.029",
        cpf_limit: "25",
        status: "active",
      });
      setShowPassword(false);
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Conta de Milhagem</DialogTitle>
          <DialogDescription>
            Cadastre uma nova conta vinculada a um fornecedor
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplier">Fornecedor</Label>
            <Select
              value={formData.supplier_id}
              onValueChange={(value) =>
                setFormData({ ...formData, supplier_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o fornecedor (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum fornecedor</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="holder_name">Titular da Conta *</Label>
              <Input
                id="holder_name"
                value={formData.account_holder_name}
                onChange={(e) =>
                  setFormData({ ...formData, account_holder_name: e.target.value })
                }
                placeholder="Ex: João Silva"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="holder_cpf">CPF do Titular *</Label>
              <Input
                id="holder_cpf"
                value={formData.account_holder_cpf}
                onChange={(e) =>
                  setFormData({ ...formData, account_holder_cpf: formatCPF(e.target.value) })
                }
                placeholder="000.000.000-00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_number">Número da Conta *</Label>
            <Input
              id="account_number"
              value={formData.account_number}
              onChange={(e) =>
                setFormData({ ...formData, account_number: e.target.value })
              }
              placeholder="Ex: 123456789"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha da Conta</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Senha de acesso à conta"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="balance">Saldo Inicial (milhas)</Label>
              <Input
                id="balance"
                type="number"
                value={formData.balance}
                onChange={(e) =>
                  setFormData({ ...formData, balance: e.target.value })
                }
                placeholder="Ex: 50000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf_limit">Limite de CPFs *</Label>
              <Input
                id="cpf_limit"
                type="number"
                value={formData.cpf_limit}
                onChange={(e) =>
                  setFormData({ ...formData, cpf_limit: e.target.value })
                }
                placeholder="Ex: 25"
                required
              />
              <Badge variant="outline" className="mt-1">
                CPFs usados: 0/{formData.cpf_limit || 0}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost_per_mile">Custo por Milha (R$) *</Label>
            <Input
              id="cost_per_mile"
              type="number"
              step="0.001"
              value={formData.cost_per_mile}
              onChange={(e) =>
                setFormData({ ...formData, cost_per_mile: e.target.value })
              }
              placeholder="Ex: 0.029"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
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

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Criar Conta</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
