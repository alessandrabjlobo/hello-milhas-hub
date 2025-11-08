import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, Save, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

type RenewalType = "annual" | "rolling";

interface Airline {
  id: string;
  name: string;
  code: string;
  cpf_limit?: number | null;
  renewal_type?: RenewalType | null;
}

interface AirlineRule {
  airline_company_id: string;
  cpf_limit: number;
  renewal_type: RenewalType;
}

export default function ProgramRules() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [rules, setRules] = useState<Record<string, AirlineRule>>({});
  const [originalRules, setOriginalRules] = useState<Record<string, AirlineRule>>({});

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("airline_companies")
        .select("id, name, code, cpf_limit, renewal_type")
        .order("name");

      if (error) throw error;

      const list = (data ?? []) as Airline[];
      setAirlines(list);

      const initial: Record<string, AirlineRule> = {};
      list.forEach((airline) => {
        initial[airline.id] = {
          airline_company_id: airline.id,
          cpf_limit: normalizeLimit(airline.cpf_limit),
          renewal_type: normalizeRenewal(airline.renewal_type),
        };
      });
      setRules(initial);
      setOriginalRules(initial);
    } catch (err: any) {
      toast({
        title: "Erro ao carregar dados",
        description: err?.message ?? "Não foi possível obter as companhias.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const normalizeLimit = (v: number | null | undefined) => {
    const n = Number(v ?? 25);
    if (!Number.isFinite(n)) return 25;
    return Math.min(Math.max(Math.round(n), 1), 1000); // 1..1000
  };

  const normalizeRenewal = (v: RenewalType | null | undefined): RenewalType =>
    v === "rolling" ? "rolling" : "annual";

  const updateRule = (airlineId: string, field: keyof AirlineRule, value: any) => {
    setRules((prev) => {
      const curr = prev[airlineId];
      if (!curr) return prev;
      const next: AirlineRule = {
        ...curr,
        [field]:
          field === "cpf_limit"
            ? normalizeLimit(Number(value))
            : field === "renewal_type"
            ? (value as RenewalType)
            : value,
      };
      return { ...prev, [airlineId]: next };
    });
  };

  const diffToSave = useMemo(() => {
    const changes: { id: string; cpf_limit: number; renewal_type: RenewalType }[] = [];
    for (const [id, r] of Object.entries(rules)) {
      const orig = originalRules[id];
      if (!orig) continue;
      if (orig.cpf_limit !== r.cpf_limit || orig.renewal_type !== r.renewal_type) {
        changes.push({ id, cpf_limit: r.cpf_limit, renewal_type: r.renewal_type });
      }
    }
    return changes;
  }, [rules, originalRules]);

  const handleSave = async () => {
    if (diffToSave.length === 0) {
      toast({ title: "Nada para salvar", description: "Nenhuma alteração detectada." });
      return;
    }
    try {
      setSaving(true);

      // Salva em pequenos lotes para evitar timeouts em conexões lentas
      const chunkSize = 10;
      for (let i = 0; i < diffToSave.length; i += chunkSize) {
        const chunk = diffToSave.slice(i, i + chunkSize);
        const ids = chunk.map((c) => c.id);

        const { error } = await supabase
          .from("airline_companies")
          .update(
            Object.fromEntries(
              // PostgREST não aceita "múltiplos values"; então atualizamos por id via "in" com a mesma carga
              // Para valores distintos por id, teríamos que fazer update por linha (loop).
              // Como os valores podem variar, fazemos *linha a linha* aqui:
              []
            )
          )
          .in("id", [] as any); // placeholder para manter a tipagem

        // Como cada linha pode ter valores distintos, fazemos uma a uma:
        for (const row of chunk) {
          const { error: rowErr } = await supabase
            .from("airline_companies")
            .update({
              cpf_limit: row.cpf_limit,
              renewal_type: row.renewal_type,
            })
            .eq("id", row.id);

          if (rowErr) throw rowErr;
        }
      }

      setOriginalRules(rules);
      toast({
        title: "Regras salvas",
        description: "As configurações foram atualizadas com sucesso.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao salvar regras",
        description: err?.message ?? "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Regras do Programa</h1>
          <p className="text-muted-foreground">
            Configure limites de CPF e tipos de renovação por companhia.
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Estas configurações serão aplicadas como padrão ao criar <b>novas</b> contas de milhagem.
          Contas já existentes não são alteradas automaticamente.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {airlines.map((airline) => {
          const rule = rules[airline.id];
          return (
            <Card key={airline.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {airline.name}
                </CardTitle>
                <CardDescription>Código: {airline.code}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`cpf-limit-${airline.id}`}>Limite de CPFs</Label>
                    <Input
                      id={`cpf-limit-${airline.id}`}
                      type="number"
                      min={1}
                      max={1000}
                      value={rule?.cpf_limit ?? 25}
                      onChange={(e) =>
                        updateRule(airline.id, "cpf_limit", e.target.value)
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Quantidade máxima de CPFs diferentes por conta.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`renewal-type-${airline.id}`}>Tipo de Renovação</Label>
                    <Select
                      value={rule?.renewal_type ?? "annual"}
                      onValueChange={(v: RenewalType) =>
                        updateRule(airline.id, "renewal_type", v)
                      }
                    >
                      <SelectTrigger id={`renewal-type-${airline.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">
                          Anual (vira em data fixa, ex.: 01/01)
                        </SelectItem>
                        <SelectItem value="rolling">
                          Rotativo (12 meses após cada uso)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {rule?.renewal_type === "rolling"
                        ? "Cada CPF renova 12 meses após o uso."
                        : "Todos os CPFs renovam juntos na data definida (ex.: 01/01)."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving || diffToSave.length === 0}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : diffToSave.length === 0 ? "Nada a salvar" : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
