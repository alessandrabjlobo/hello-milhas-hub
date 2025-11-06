// src/components/accounts/AddAccountDialog.tsx
import { useState, useEffect, useCallback } from "react";
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
import { Eye, EyeOff, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type AirlineCompany = {
  id: string;
  name: string;
  code: string;
};

type Supplier = {
  id: string;
  name: string;
};

interface AddAccountDialogProps {
  onAccountAdded: () => void;
}

export const AddAccountDialog = ({ onAccountAdded }: AddAccountDialogProps) => {
  const [open, setOpen] = useState(false);
  const [airlines, setAirlines] = useState<AirlineCompany[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingAirlines, setLoadingAirlines] = useState(false);
  const [profileSupplierId, setProfileSupplierId] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Sempre strings ("" quando vazio) para não alternar controlado/não-controlado
  const [formData, setFormData] = useState<{
    airline_company_id: string;
    supplier_id: string;
    account_holder_name: string;
    account_holder_cpf: string;
    password: string;
    account_number: string;
    balance: string;
    cost_per_mile: string;
    cpf_limit: string;
    status: "active" | "inactive";
  }>({
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

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const fetchAirlinesBySupplier = useCallback(
    async (supplierId: string) => {
      setLoadingAirlines(true);
      try {
        if (!supplierId) {
          setAirlines([]);
          return;
        }
        const { data: linkedData, error } = await supabase
          .from("suppliers_airlines")
          .select("airline_companies(id, name, code)")
          .eq("supplier_id", supplierId);

        if (error) throw error;

        const filteredAirlines: AirlineCompany[] = (linkedData || [])
          .map((item: any) => item.airline_companies)
          .filter(Boolean);

        setAirlines(filteredAirlines);
      } catch (err: any) {
        toast({
          title: "Erro ao carregar programas",
          description: err.message,
          variant: "destructive",
        });
        setAirlines([]);
      } finally {
        setLoadingAirlines(false);
      }
    },
    [toast]
  );

  // Ao abrir: carrega lista de fornecedores e supplier do perfil
  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const [{ data: userData }, { data: suppliersRes }] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from("suppliers").select("id, name").order("name"),
        ]);

        if (suppliersRes) setSuppliers(suppliersRes);

        let initialSupplier = "";
        if (userData.user?.id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("supplier_id")
            .eq("id", userData.user.id)
            .single();

          initialSupplier = profileData?.supplier_id ?? "";
          setProfileSupplierId(initialSupplier);
        }

        // se o form ainda não tiver supplier, usa o do perfil
        const supplierToUse = formData.supplier_id || initialSupplier || "";
        setFormData((f) => ({ ...f, supplier_id: supplierToUse }));

        await fetchAirlinesBySupplier(supplierToUse);
      } catch (err: any) {
        toast({
          title: "Erro ao carregar dados",
          description: err.message,
          variant: "destructive",
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Mudou fornecedor: limpa programa e recarrega companhias
  useEffect(() => {
    if (!open) return;
    fetchAirlinesBySupplier(formData.supplier_id || "");
    setFormData((f) => ({ ...f, airline_company_id: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.supplier_id]);

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
        description: "Preencha os campos marcados com *",
        variant: "destructive",
      });
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("mileage_accounts").insert([
      {
        user_id: userData.user.id,
        airline_company_id: formData.airline_company_id,
        // se sua coluna aceitar null, mande null quando vazio
        supplier_id: formData.supplier_id || null,
        account_holder_name: formData.account_holder_name,
        account_holder_cpf: formData.account_holder_cpf.replace(/\D/g, ""),
        password_encrypted: formData.password || null,
        account_number: formData.account_number,
        balance: Number(formData.balance || 0),
        cost_per_mile: Number(formData.cost_per_mile || 0),
        cpf_limit: Number(formData.cpf_limit || 0),
        status: formData.status,
      },
    ]);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Conta adicionada",
      description: "A conta de milhagem foi cadastrada com sucesso.",
    });

    setOpen(false);
    setFormData({
      airline_company_id: "",
      supplier_id: profileSupplierId, // volta ao do perfil por padrão
      account_holder_name: "",
      account_holder_cpf: "",
      password: "",
      account_number: "",
      balance: "",
      cost_per_mile: "0.029",
      cpf_limit: "25",
      status: "active",
    });

    onAccountAdded();
  };

  const noAirlinesForSupplier =
    !loadingAirlines &&
    (airlines?.length ?? 0) === 0 &&
    (formData.supplier_id || "") !== "";

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
          {/* Fornecedor */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Fornecedor</Label>
            <Select
              value={formData.supplier_id || ""}
              onValueChange={(value) =>
                setFormData((f) => ({ ...f, supplier_id: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o fornecedor (opcional)" />
              </SelectTrigger>
              <SelectContent position="popper">
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Programa de Milhagem */}
          <div className="space-y-2">
            <Label htmlFor="airline">Programa de Milhagem *</Label>

            {noAirlinesForSupplier ? (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                Este fornecedor ainda não possui companhias vinculadas.
                <div className="mt-2">
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => navigate("/settings/my-airlines")}
                  >
                    Vincular companhias
                  </Button>
                </div>
              </div>
            ) : (
              <Select
                value={formData.airline_company_id || ""}
                onValueChange={(value) =>
                  setFormData((f) => ({ ...f, airline_company_id: value }))
                }
                disabled={loadingAirlines || (airlines?.length ?? 0) === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o programa" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-60">
                  {airlines.map((airline) => (
                    <SelectItem key={airline.id} value={airline.id}>
                      {airline.name} ({airline.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Titular / CPF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_holder_name">Titular *</Label>
              <Input
                id="account_holder_name"
                value={formData.account_holder_name}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    account_holder_name: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_holder_cpf">CPF *</Label>
              <Input
                id="account_holder_cpf"
                value={formData.account_holder_cpf}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    account_holder_cpf: formatCPF(e.target.value),
                  }))
                }
                maxLength={14}
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="account_number">Número da conta *</Label>
              <Input
                id="account_number"
                value={formData.account_number}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, account_number: e.target.value }))
                }
                placeholder="Ex: 123456789"
              />
            </div>

            {/* Senha opcional */}
            <div className="space-y-2 sm:col-span-2 relative">
              <Label htmlFor="password">Senha (opcional)</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, password: e.target.value }))
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
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>

            {/* Financeiro */}
            <div className="space-y-2">
              <Label htmlFor="balance">Saldo (milhas)</Label>
              <Input
                id="balance"
                type="number"
                inputMode="numeric"
                value={formData.balance}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, balance: e.target.value }))
                }
                placeholder="Ex: 100000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost_per_mile">Custo por milha (R$)</Label>
              <Input
                id="cost_per_mile"
                type="number"
                step="0.001"
                inputMode="decimal"
                value={formData.cost_per_mile}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, cost_per_mile: e.target.value }))
                }
                placeholder="Ex: 0.029"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf_limit">Limite por CPF (milhas)</Label>
              <Input
                id="cpf_limit"
                type="number"
                inputMode="numeric"
                value={formData.cpf_limit}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, cpf_limit: e.target.value }))
                }
                placeholder="Ex: 25"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "active" | "inactive") =>
                  setFormData((f) => ({ ...f, status: value }))
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
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={
                loadingAirlines ||
                (airlines?.length ?? 0) === 0 ||
                !formData.airline_company_id ||
                !formData.account_number ||
                !formData.account_holder_name ||
                !formData.account_holder_cpf
              }
            >
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
