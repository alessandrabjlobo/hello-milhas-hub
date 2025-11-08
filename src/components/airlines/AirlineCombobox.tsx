import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type Option = { id: string; label: string };

export function AirlineCombobox({
  options,
  value,
  onChange,
  onCreate, // 👈 callback para criar quando não existe
  placeholder = "Programa/Cia",
  disabled,
}: {
  options: Option[];
  value?: string;
  onChange: (id: string) => void;
  onCreate?: (nameOrQuery: string) => Promise<Option | null>;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selected = options.find((o) => o.id === value)?.label ?? placeholder;

  const filtered =
    query.trim().length === 0
      ? options
      : options.filter((o) =>
          o.label.toLowerCase().includes(query.toLowerCase())
        );

  const handleCreate = async () => {
    if (!onCreate || !query.trim()) return;
    const created = await onCreate(query.trim());
    if (created) {
      onChange(created.id);
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selected}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[320px]">
        <Command>
          <CommandInput
            placeholder="Digite nome ou código..."
            value={query}
            onValueChange={setQuery}
          />
          {filtered.length === 0 ? (
            <div className="p-2">
              <CommandEmpty className="py-2 px-2">
                Nenhuma companhia encontrada.
              </CommandEmpty>
              {onCreate && (
                <Button onClick={handleCreate} className="w-full" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar “{query}”
                </Button>
              )}
            </div>
          ) : (
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
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      opt.id === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
