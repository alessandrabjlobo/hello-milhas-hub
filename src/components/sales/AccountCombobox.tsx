import { useState } from "react";
import { Check, ChevronsUpDown, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { MileageAccount } from "@/hooks/useMileageAccounts";

interface AccountComboboxProps {
  accounts: MileageAccount[];
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AccountCombobox({
  accounts,
  value,
  onChange,
  placeholder = "Busque por companhia ou número da conta...",
  disabled = false,
}: AccountComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedAccount = accounts.find(acc => acc.id === value);

  // Formatar exibição: "GOL - 123456789 - 250k milhas"
  const formatAccount = (account: MileageAccount) => {
    const airline = account.airline_companies?.name || "Companhia";
    const balance = (account.balance / 1000).toFixed(0);
    return `${airline} - ${account.account_number} - ${balance}k milhas`;
  };

  // Formatar CPF parcial para busca segura
  const formatCpfPartial = (cpf?: string | null) => {
    if (!cpf) return "";
    // Mostra apenas últimos 4 dígitos
    return cpf.slice(-4);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            {value && selectedAccount ? (
              formatAccount(selectedAccount)
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Busque por companhia, conta, titular ou CPF..." 
          />
          <CommandEmpty>
            {accounts.length === 0 
              ? "Nenhuma conta cadastrada" 
              : "Nenhuma conta encontrada"
            }
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {accounts.map((account) => (
              <CommandItem
                key={account.id}
                value={`${account.airline_companies?.name} ${account.airline_companies?.code} ${account.account_number} ${account.account_holder_name || ""} ${formatCpfPartial(account.account_holder_cpf)}`}
                onSelect={() => {
                  onChange(account.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === account.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {account.airline_companies?.name || "Companhia"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {account.account_holder_name || "Sem titular"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Conta: {account.account_number}</span>
                    {account.account_holder_cpf && (
                      <span className="text-xs">CPF: ***{formatCpfPartial(account.account_holder_cpf)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span className="font-semibold text-primary">R$ {(account.cost_per_mile * 1000).toFixed(2)}/mil</span>
                    <span className="font-medium text-green-600">
                      {account.balance.toLocaleString('pt-BR')} milhas
                    </span>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
