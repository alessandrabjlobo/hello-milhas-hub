// src/components/airlines/AirlineCombobox.tsx
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

export type Airline = {
  id: string;
  name: string;
  code: string;
};

type Props = {
  value?: Airline | null;
  onChange: (airline: Airline | null) => void;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
};

export function AirlineCombobox({
  value,
  onChange,
  className,
  triggerClassName,
  placeholder = "Programa/Cia",
}: Props) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [airlines, setAirlines] = React.useState<Airline[]>([]);

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("airline_companies")
        .select("id, name, code")
        .order("name", { ascending: true });

      if (!active) return;
      if (error) {
        toast({
          title: "Erro ao carregar companhias",
          description: error.message,
          variant: "destructive",
        });
        setAirlines([]);
      } else {
        setAirlines(data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return airlines;
    return airlines.filter(
      (a) =>
        a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)
    );
  }, [airlines, query]);

  async function handleCreate(raw: string) {
    const text = raw.trim();
    if (!text) return;

    // Aceita "LATAM (LA)" ou "Latam" (gera código = 2 primeiras letras)
    const m = text.match(/^\s*(.+?)\s*(?:\(([\w-]{2,5})\))?\s*$/i);
    const name = (m?.[1] ?? text).trim();
    const code = (m?.[2] ?? name.slice(0, 2)).toUpperCase();

    setCreating(true);
    const { data, error } = await supabase
      .from("airline_companies")
      .insert({ name, code })
      .select("id, name, code")
      .single();

    setCreating(false);

    if (error) {
      toast({
        title: "Não foi possível criar a companhia",
        description:
          error.code === "42501"
            ? "Sem permissão para inserir nesta tabela (RLS)."
            : error.message,
        variant: "destructive",
      });
      return;
    }

    setAirlines((prev) =>
      [...prev, data!].sort((a, b) => a.name.localeCompare(b.name))
    );
    onChange(data!);
    setQuery("");
    setOpen(false);
    toast({
      title: "Companhia adicionada",
      description: `${data!.name} (${data!.code})`,
    });
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
          {value ? `${value.name} (${value.code})` : placeholder}
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
            {loading ? (
              <div className="py-6 flex items-center justify-center text-sm text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando…
              </div>
            ) : (
              <>
                <CommandEmpty>Nenhuma companhia encontrada.</CommandEmpty>
                <CommandGroup>
                  {filtered.map((a) => (
                    <CommandItem
                      key={a.id}
                      value={`${a.name} (${a.code})`}
                      onSelect={() => {
                        onChange(a);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      {a.name} ({a.code})
                    </CommandItem>
                  ))}
                </CommandGroup>

                <div className="p-2 border-t">
                  <Button
                    className="w-full"
                    type="button"
                    onClick={() => handleCreate(query)}
                    disabled={!query.trim() || creating}
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
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
