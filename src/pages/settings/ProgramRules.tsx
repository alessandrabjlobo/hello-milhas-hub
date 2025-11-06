import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useProgramRules, Rule } from "@/hooks/useProgramRules";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

type Airline = { id: string; name: string; code: string };

export default function ProgramRules() {
  // scope = fornecedor atual (se existir) senão "global"
  const { supplierId } = useUserRole();
  const [scopeMode, setScopeMode] = useState<"supplier" | "global">(
    supplierId ? "supplier" : "global"
  );
  const scope = scopeMode === "supplier" && supplierId ? supplierId : "global";

  const { list, setRule, deleteRule } = useProgramRules(scope);

  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [airlineId, setAirlineId] = useState("");
  const [cpfLimit, setCpfLimit] = useState("25");
  const [period, setPeriod] = useState<Rule["period"]>("mes");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("airline_companies")
        .select("id, name, code")
        .order("name");
      setAirlines(data ?? []);
    })();
  }, []);

  // map id -> info pra exibir nome ao listar
  const byId = useMemo(() => {
    const m: Record<string, Airline> = {};
    airlines.forEach(a => (m[a.id] = a));
    return m;
  }, [airlines]);

  const addOrUpdate = () => {
    if (!airlineId) return;
    setRule(airlineId, { cpf_limit: Number(cpfLimit || 0), period });
    setAirlineId("");
    setCpfLimit("25");
    setPeriod("mes");
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Regras do Programa</h1>
          <p className="text-muted-foreground">
            Defina o limite de uso de CPF por companhia. Essas regras entram como padrão ao criar novas contas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={scopeMode}
            onValueChange={(v: "supplier" | "global") => setScopeMode(v)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="supplier" disabled={!supplierId}>
                {supplierId ? "Escopo: Fornecedor atual" : "Fornecedor indisponível"}
              </SelectItem>
              <SelectItem value="global">Escopo: Global</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova Regra</CardTitle>
          <CardDescription>
            Escopo atual:{" "}
            <Badge variant="secondary">
              {scope === "global" ? "Global" : `Fornecedor (${scope.slice(0, 6)}...)`}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <Select value={airlineId} onValueChange={setAirlineId}>
              <SelectTrigger><SelectValue placeholder="Programa/Cia" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {airlines.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Limite por CPF"
              value={cpfLimit}
              onChange={(e) => setCpfLimit(e.target.value)}
              inputMode="numeric"
            />

            <Select value={period} onValueChange={(v: Rule["period"]) => setPeriod(v)}>
              <SelectTrigger><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">por mês</SelectItem>
                <SelectItem value="dia">por dia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={addOrUpdate}>Salvar Regra</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regras Atuais</CardTitle>
          <CardDescription>Aplicadas automaticamente no cadastro.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma regra definida.</p>
          ) : (
            list.map(r => {
              const a = byId[r.airlineId];
              return (
                <div
                  key={r.airlineId}
                  className="flex items-center justify-between border rounded-md px-3 py-2"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium">
                      {a ? `${a.name} (${a.code})` : `Cia ${r.airlineId}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Limite por CPF: <b>{r.cpf_limit}</b> — Período:{" "}
                      <b>{r.period === "mes" ? "mês" : "dia"}</b>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteRule(r.airlineId)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remover
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
