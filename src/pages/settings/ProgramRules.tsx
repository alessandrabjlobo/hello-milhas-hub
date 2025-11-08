import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAgencyPrograms } from "@/hooks/useAgencyPrograms";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

// ✅ combobox com busca
import { AirlineCombobox } from "@/components/airlines/AirlineCombobox";

type Airline = { id: string; name: string; code: string };
type Period = "calendar_year" | "rolling_year";

export default function ProgramRules() {
  const { supplierId } = useUserRole();
  const { programs, loading: programsLoading, createOrUpdateProgram, deleteProgram } =
    useAgencyPrograms(supplierId);

  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [airlineId, setAirlineId] = useState("");
  const [cpfLimit, setCpfLimit] = useState("25");
  const [period, setPeriod] = useState<Period>("calendar_year");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("airline_companies")
        .select("id, name, code")
        .order("name");
      setAirlines(data ?? []);
    })();
  }, []);

  const options = useMemo(
    () => airlines.map((a) => ({ id: a.id, label: `${a.name} (${a.code})` })),
    [airlines]
  );

  const addOrUpdate = async () => {
    if (!airlineId) return;
    const success = await createOrUpdateProgram(airlineId, {
      cpf_limit: Number(cpfLimit || 0),
      // ⚠️ backend deve aceitar estes valores:
      // 'calendar_year' (vira em 01/jan) | 'rolling_year' (12 meses após uso)
      cpf_period: period,
    });
    if (success) {
      setAirlineId("");
      setCpfLimit("25");
      setPeriod("calendar_year");
    }
  };

  const renderPeriod = (p?: string) =>
    p === "rolling_year" ? "em 1 ano após uso" : "por ano (01/jan)";

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Programas Configurados</h1>
        <p className="text-muted-foreground">
          Selecione quais programas de milhas sua agência trabalha e defina as regras padrão para cada um.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar Programa</CardTitle>
          <CardDescription>Selecione um programa e defina as regras padrão</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            {/* 🔎 combobox digitável */}
            <AirlineCombobox
              options={options}
              value={airlineId}
              onChange={setAirlineId}
              placeholder="Programa/Cia"
            />

            <Input
              placeholder="Limite por CPF"
              value={cpfLimit}
              onChange={(e) => setCpfLimit(e.target.value)}
              inputMode="numeric"
            />

            {/* novo período */}
            <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar_year">por ano (vira em 01/jan)</SelectItem>
                <SelectItem value="rolling_year">em 1 ano após uso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={addOrUpdate} disabled={!airlineId}>Salvar Regra</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Programas Ativos</CardTitle>
          <CardDescription>
            Esses programas estarão disponíveis ao cadastrar contas e realizar vendas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {programsLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : programs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum programa configurado. Adicione programas para começar.
            </p>
          ) : (
            programs.map((prog) => (
              <div
                key={prog.id}
                className="flex items-center justify-between border rounded-md px-3 py-2"
              >
                <div className="space-y-0.5">
                  <div className="font-medium">
                    {prog.airline_companies?.name} ({prog.airline_companies?.code})
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Limite por CPF: <b>{prog.cpf_limit}</b> — Período:{" "}
                    <b>{renderPeriod(prog.cpf_period)}</b>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => deleteProgram(prog.id)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
