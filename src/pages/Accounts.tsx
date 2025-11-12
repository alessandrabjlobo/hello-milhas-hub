import { Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Eye, CreditCard, TrendingUp, AlertTriangle, Filter, X, ChevronDown } from "lucide-react";
import { useMileageAccounts } from "@/hooks/useMileageAccounts";
import { AddAccountDialog } from "@/components/accounts/AddAccountDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddMovementDialog } from "@/components/movements/AddMovementDialog";

export default function Accounts() {
  const { accounts, loading, fetchAccounts } = useMileageAccounts();

  // Estados dos filtros
  const [searchTerm, setSearchTerm] = useState(() => 
    localStorage.getItem("accounts_filter_search") || ""
  );
  const [selectedProgram, setSelectedProgram] = useState(() => 
    localStorage.getItem("accounts_filter_program") || "all"
  );
  const [selectedSupplier, setSelectedSupplier] = useState(() => 
    localStorage.getItem("accounts_filter_supplier") || "all"
  );
  const [selectedStatus, setSelectedStatus] = useState(() => 
    localStorage.getItem("accounts_filter_status") || "all"
  );
  const [balanceZero, setBalanceZero] = useState(() => 
    localStorage.getItem("accounts_filter_balance_zero") === "true"
  );
  const [balanceUnder10k, setBalanceUnder10k] = useState(() => 
    localStorage.getItem("accounts_filter_balance_under10k") === "true"
  );
  const [balance10to50k, setBalance10to50k] = useState(() => 
    localStorage.getItem("accounts_filter_balance_10to50k") === "true"
  );
  const [balanceOver50k, setBalanceOver50k] = useState(() => 
    localStorage.getItem("accounts_filter_balance_over50k") === "true"
  );
  const [cpfCritical, setCpfCritical] = useState(() => 
    localStorage.getItem("accounts_filter_cpf_critical") === "true"
  );
  const [cpfWarning, setCpfWarning] = useState(() => 
    localStorage.getItem("accounts_filter_cpf_warning") === "true"
  );
  const [cpfNormal, setCpfNormal] = useState(() => 
    localStorage.getItem("accounts_filter_cpf_normal") === "true"
  );
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  // Persistir filtros
  useEffect(() => {
    localStorage.setItem("accounts_filter_search", searchTerm);
    localStorage.setItem("accounts_filter_program", selectedProgram);
    localStorage.setItem("accounts_filter_supplier", selectedSupplier);
    localStorage.setItem("accounts_filter_status", selectedStatus);
    localStorage.setItem("accounts_filter_balance_zero", balanceZero.toString());
    localStorage.setItem("accounts_filter_balance_under10k", balanceUnder10k.toString());
    localStorage.setItem("accounts_filter_balance_10to50k", balance10to50k.toString());
    localStorage.setItem("accounts_filter_balance_over50k", balanceOver50k.toString());
    localStorage.setItem("accounts_filter_cpf_critical", cpfCritical.toString());
    localStorage.setItem("accounts_filter_cpf_warning", cpfWarning.toString());
    localStorage.setItem("accounts_filter_cpf_normal", cpfNormal.toString());
  }, [searchTerm, selectedProgram, selectedSupplier, selectedStatus, balanceZero, balanceUnder10k, balance10to50k, balanceOver50k, cpfCritical, cpfWarning, cpfNormal]);

  // Extrair programas e fornecedores únicos
  const programs = useMemo(() => {
    const uniquePrograms = new Set<string>();
    accounts.forEach(acc => {
      const code = acc.airline_companies?.code;
      if (code) uniquePrograms.add(code);
    });
    return Array.from(uniquePrograms).sort();
  }, [accounts]);

  const suppliers = useMemo(() => {
    const uniqueSuppliers = new Set<string>();
    accounts.forEach(acc => {
      const name = acc.supplier?.name;
      if (name) uniqueSuppliers.add(name);
    });
    return Array.from(uniqueSuppliers).sort();
  }, [accounts]);

  // Aplicar filtros
  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      // Busca
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesAccount = account.account_number?.toLowerCase().includes(search);
        const matchesHolder = account.account_holder_name?.toLowerCase().includes(search);
        if (!matchesAccount && !matchesHolder) return false;
      }

      // Programa
      if (selectedProgram !== "all") {
        const airlineCode = account.airline_companies?.code;
        if (airlineCode !== selectedProgram) return false;
      }

      // Fornecedor
      if (selectedSupplier !== "all") {
        const supplierName = account.supplier?.name;
        if (supplierName !== selectedSupplier) return false;
      }

      // Status
      if (selectedStatus !== "all") {
        if (account.status !== selectedStatus) return false;
      }

      // Filtros de saldo
      const hasBalanceFilter = balanceZero || balanceUnder10k || balance10to50k || balanceOver50k;
      if (hasBalanceFilter) {
        const balance = account.balance || 0;
        const matchesBalance = 
          (balanceZero && balance === 0) ||
          (balanceUnder10k && balance > 0 && balance < 10000) ||
          (balance10to50k && balance >= 10000 && balance <= 50000) ||
          (balanceOver50k && balance > 50000);
        if (!matchesBalance) return false;
      }

      // Filtros de CPF
      const hasCpfFilter = cpfCritical || cpfWarning || cpfNormal;
      if (hasCpfFilter) {
        const percentage = ((account.cpf_count || 0) / (account.cpf_limit || 25)) * 100;
        const matchesCpf = 
          (cpfCritical && percentage >= 90) ||
          (cpfWarning && percentage >= 75 && percentage < 90) ||
          (cpfNormal && percentage < 75);
        if (!matchesCpf) return false;
      }

      return true;
    });
  }, [accounts, searchTerm, selectedProgram, selectedSupplier, selectedStatus, balanceZero, balanceUnder10k, balance10to50k, balanceOver50k, cpfCritical, cpfWarning, cpfNormal]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedProgram("all");
    setSelectedSupplier("all");
    setSelectedStatus("all");
    setBalanceZero(false);
    setBalanceUnder10k(false);
    setBalance10to50k(false);
    setBalanceOver50k(false);
    setCpfCritical(false);
    setCpfWarning(false);
    setCpfNormal(false);
  };

  const hasActiveFilters = searchTerm || selectedProgram !== "all" || selectedSupplier !== "all" || 
    selectedStatus !== "all" || balanceZero || balanceUnder10k || balance10to50k || balanceOver50k || 
    cpfCritical || cpfWarning || cpfNormal;
  
  const advancedFiltersCount = 
    (balanceZero ? 1 : 0) + 
    (balanceUnder10k ? 1 : 0) + 
    (balance10to50k ? 1 : 0) + 
    (balanceOver50k ? 1 : 0) + 
    (cpfCritical ? 1 : 0) + 
    (cpfWarning ? 1 : 0) + 
    (cpfNormal ? 1 : 0);

  const getCPFBadge = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    let variant: "default" | "secondary" | "destructive" = "default";
    
    if (percentage >= 90) variant = "destructive";
    else if (percentage >= 75) variant = "secondary";
    
    return (
      <Badge variant={variant}>
        {used}/{limit}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Card className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Contas de Milhagem</h1>
            <p className="text-muted-foreground">
              {filteredAccounts.length} de {accounts.length} conta(s)
            </p>
          </div>
          <AddAccountDialog onAccountAdded={fetchAccounts} />
        </div>

        {/* Painel de Filtros */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4" />
            <h3 className="font-semibold">Filtros</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </div>
          
          <div className="space-y-4">
            {/* Filtros Básicos */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <Input
                  id="search"
                  placeholder="Conta, titular..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="program">Programa</Label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger id="program">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {programs.map(code => (
                      <SelectItem key={code} value={code}>{code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="supplier">Fornecedor</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {suppliers.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="inactive">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Filtros Avançados (Collapsible) */}
            <Collapsible open={advancedFiltersOpen} onOpenChange={setAdvancedFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros Avançados
                    {advancedFiltersCount > 0 && (
                      <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                        {advancedFiltersCount}
                      </span>
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${advancedFiltersOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                  <div>
                    <Label className="mb-3 block font-semibold">Saldo</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="balance-zero" checked={balanceZero} onCheckedChange={(checked) => setBalanceZero(checked as boolean)} />
                        <label htmlFor="balance-zero" className="text-sm cursor-pointer">Zeradas (0)</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="balance-under10k" checked={balanceUnder10k} onCheckedChange={(checked) => setBalanceUnder10k(checked as boolean)} />
                        <label htmlFor="balance-under10k" className="text-sm cursor-pointer">Abaixo de 10k</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="balance-10to50k" checked={balance10to50k} onCheckedChange={(checked) => setBalance10to50k(checked as boolean)} />
                        <label htmlFor="balance-10to50k" className="text-sm cursor-pointer">Entre 10k-50k</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="balance-over50k" checked={balanceOver50k} onCheckedChange={(checked) => setBalanceOver50k(checked as boolean)} />
                        <label htmlFor="balance-over50k" className="text-sm cursor-pointer">Acima de 50k</label>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="mb-3 block font-semibold">Uso de CPF</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="cpf-critical" checked={cpfCritical} onCheckedChange={(checked) => setCpfCritical(checked as boolean)} />
                        <label htmlFor="cpf-critical" className="text-sm cursor-pointer">Crítico (≥90%)</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="cpf-warning" checked={cpfWarning} onCheckedChange={(checked) => setCpfWarning(checked as boolean)} />
                        <label htmlFor="cpf-warning" className="text-sm cursor-pointer">Alerta (≥75%)</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="cpf-normal" checked={cpfNormal} onCheckedChange={(checked) => setCpfNormal(checked as boolean)} />
                        <label htmlFor="cpf-normal" className="text-sm cursor-pointer">Normal (&lt;75%)</label>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </Card>

        <Card>
          {filteredAccounts.length === 0 ? (
            <>
              <EmptyState
                icon={CreditCard}
                title={accounts.length === 0 ? "Nenhuma conta cadastrada" : "Nenhuma conta encontrada"}
                description={accounts.length === 0 ? "Cadastre a primeira conta de milhagem para começar." : "Ajuste os filtros para ver mais resultados."}
              />
              {accounts.length === 0 && (
                <div className="text-center pb-6">
                  <AddAccountDialog onAccountAdded={fetchAccounts} />
                </div>
              )}
            </>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Companhia</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Número da Conta</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>CPFs Usados</TableHead>
                  <TableHead>Custo/1k</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {account.airline_companies?.code || "-"}
                        </Badge>
                        <span className="font-medium">
                          {account.airline_companies?.name || "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {account.supplier?.name || "Não informado"}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">
                      {account.account_number?.slice(-4) 
                        ? `****${account.account_number.slice(-4)}`
                        : account.account_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="font-semibold">
                          {(account.balance || 0).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCPFBadge(account.cpf_count || 0, account.cpf_limit || 25)}
                        {((account.cpf_count || 0) / (account.cpf_limit || 25)) >= 0.9 && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      R$ {(account.cost_per_mile * 1000).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.status === "active" ? "default" : "secondary"}>
                        {account.status === "active" ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <AddMovementDialog accountId={account.id} onMovementAdded={fetchAccounts} showLabel />
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/accounts/${account.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalhes
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
