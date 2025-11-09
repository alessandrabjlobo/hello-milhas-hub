import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string };

type Props = {
  options: Option[];
  value: string;                               // id selecionado (ou "")
  onChange: (id: string) => void;              // dispara ao escolher uma opção
  onCreate?: (typed: string) => Promise<Option | null>; // cria nova cia e retorna {id,label}
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
};

export function AirlineCombobox({
  options,
  value,
  onChange,
  onCreate,
  placeholder = "Programa/Cia",
  className,
  triggerClassName,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const selected = React.useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  async function handleCreateClick() {
    if (!onCreate) return;
    const typed = query.trim();
    if (!typed) return;

    try {
      setCreating(true);
      const created = await onCreate(typed);
      if (created) {
        onChange(created.id);  // seleciona a recém-criada
        setQuery("");
        setOpen(false);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", triggerClassName)}
          onClick={() => setOpen((o) => !o)}
        >
          {selected ? selected.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0", className)}>
        <Command>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Digite nome ou código..."
          />
          <CommandList>
            <CommandEmpty>Nenhuma companhia encontrada.</CommandEmpty>

            <CommandGroup>
              {filtered.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt.id);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>

            {onCreate && (
              <div className="p-2 border-t">
                <Button
                  type="button"
                  className="w-full"
                  disabled={!query.trim() || creating}
                  onClick={handleCreateClick}
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adicionando…
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar “{query.trim()}”
                    </>
                  )}
                </Button>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default AirlineCombobox;
