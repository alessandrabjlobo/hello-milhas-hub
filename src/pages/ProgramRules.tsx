import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Info, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AirlineCombobox } from "@/components/airlines/AirlineCombobox";
import { getSupplierId } from "@/lib/getSupplierId";
import { saveProgramRule } from "@/actions/saveProgramRule";


type RenewalType = "annual" | "rolling";

interface Airline {
  id: string;
  name: string;
  code: string;
}

interface ProgramRule {
  airline_id: string;
  cpf_limit: number;
  renewal_type: RenewalType;
}

export default function ProgramRules() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [rules, setRules] = useState<Record<string, ProgramRule>>({});
  const [originalRules, setOriginalRules] = useState<Record<string, ProgramRule>>({});

  // Quick-add form state
  const [airlineId, setAirlineId] = useState("");
  const [cpfLimitInput, setCpfLimitInput] = useState("25");
  const [period, setPeriod] = useState<RenewalType>("annual");

  useEffect(() => {
    void fetchData();
  }, []);

  const normalizeLimit = (v: number | null | undefined) => {
    const n = Number(v ?? 25);
    if (!Number.isFinite(n)) return 25;
    return Math.min(Math.max(Math.round(n), 1), 1000);
  };

  const normalizeRenewal = (v: RenewalType | null | undefined): RenewalType =>
    v === "rolling" ? "rolling" : "annual";

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch airlines
      const { data: airlinesData, error: airlinesError } = await supabase
        .from("airline_companies")
        .select("id, name, code")
        .order("name");

      if (airlinesError) {
        console.error("Erro ao carregar companhias aéreas:", airlinesError);
        toast({
          title: "Erro ao carregar companhias aéreas",
          description: `${airlinesError.message} (Código: ${airlinesError.code})`,
          variant: "destructive",
        });
        throw airlinesError;
      }

      const airlineList = (airlinesData ?? []) as Airline[];
      setAirlines(airlineList);

      // Fetch program rules for user's supplier (auto-provisioned)
      const { supplierId } = await getSupplierId();

      const { data: rulesData, error: rulesError } = await supabase
        .from("program_rules")
        .select("airline_id, cpf_limit, renewal_type")
        .eq("supplier_id", supplierId);

      if (rulesError) {
        console.error("Erro ao carregar regras:", rulesError);
        toast({
          title: "Erro ao carregar regras",
          description: `${rulesError.message} (Código: ${rulesError.code})`,
          variant: "destructive",
        });
        throw rulesError;
      }

      // Build rules map with defaults for airlines without rules
      const rulesMap: Record<string, ProgramRule> = {};
      airlineList.forEach((airline) => {
        const existingRule = rulesData?.find((r: any) => r.airline_id === airline.id);
        rulesMap[airline.id] = existingRule
          ? {
              airline_id: airline.id,
              cpf_limit: normalizeLimit(existingRule.cpf_limit),
              renewal_type: normalizeRenewal(existingRule.renewal_type as RenewalType),
            }
          : {
              airline_id: airline.id,
              cpf_limit: 25,
              renewal_type: "annual",
            };
      });

      setRules(rulesMap);
      setOriginalRules(JSON.parse(JSON.stringify(rulesMap)));
    } catch (err: any) {
      console.error("Erro ao carregar dados:", err);
      toast({
        title: "Erro ao carregar dados",
        description: err?.message ?? "Verifique sua conexão e tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const options = useMemo(
    () => airlines.map((a) => ({ id: a.id, label: `${a.name} (${a.code})` })),
    [airlines]
  );

  // Create airline
  const createAirline = async (name: string, code: string) => {
    const { supplierId, userId } = await getSupplierId();

    const { data, error } = await supabase
      .from("airline_companies")
      .insert({
        name: name.trim().toUpperCase(),
        code: code.trim().toUpperCase(),
        user_id: userId,
        supplier_id: supplierId,
      })
      .select("id, name, code")
      .single();

    if (error) throw error;

    const created = data as Airline;
    setAirlines((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setRules((prev) => ({
      ...prev,
      [created.id]: {
        airline_id: created.id,
        cpf_limit: 25,
        renewal_type: "annual",
      },
    }));
    toast({
      title: "Companhia aérea adicionada",
      description: `${created.name} (${created.code}) criada com sucesso.`,
    });
    return created;
  };

  // Combobox create handler
  const handleComboboxCreate = async (typed: string) => {
    const match = typed.match(/^(.+?)\s*\((\w{1,4})\)\s*$/i);
    let name = typed.trim().toUpperCase();
    let code = "";

    if (match) {
      name = match[1].trim().toUpperCase();
      code = match[2].toUpperCase();
    } else {
      const promptCode = window.prompt(
        `Digite o código (ex: LA para LATAM) para "${typed}":`
      );
      if (!promptCode) return null;
      code = promptCode.toUpperCase().trim();
    }

    try {
      const created = await createAirline(name, code);
      setAirlineId(created.id);
      return { id: created.id, label: `${created.name} (${created.code})` };
    } catch (err: any) {
      toast({
        title: "Erro ao criar companhia aérea",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Button to create airline via prompt
  const handleCreateAirlineViaPrompt = async () => {
    const name = window.prompt("Nome da companhia aérea (ex: LATAM):");
    if (!name) return;
    const code = window.prompt("Código (ex: LA):");
    if (!code) return;
    try {
      const created = await createAirline(name, code);
      setAirlineId(created.id);
    } catch (err: any) {
      toast({
        title: "Erro ao criar companhia aérea",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Quick-add: save rule for selected airline
  const addOrUpdateRule = async () => {
    if (!airlineId) {
      toast({ title: "Selecione uma companhia aérea", variant: "destructive" });
      return;
    }
    const cpfLimit = normalizeLimit(Number(cpfLimitInput));

    try {
      const { supplierId } = await getSupplierId();
      
      // Save program rule
      const result = await saveProgramRule({
        airline_id: airlineId,
        cpf_limit: cpfLimit,
        renewal_type: period,
      });
      
      console.log("Save result:", result);

      // Also ensure airline is linked in suppliers_airlines
      const { error: linkError } = await supabase
        .from("suppliers_airlines")
        .upsert(
          {
            supplier_id: supplierId,
            airline_company_id: airlineId,
          },
          { onConflict: "supplier_id,airline_company_id" }
        );

      if (linkError) {
        console.error("Erro ao vincular companhia:", linkError);
      }

      setRules((prev) => ({
        ...prev,
        [airlineId]: {
          airline_id: airlineId,
          cpf_limit: cpfLimit,
          renewal_type: period,
        },
      }));

      setOriginalRules((prev) => ({
        ...prev,
        [airlineId]: {
          airline_id: airlineId,
          cpf_limit: cpfLimit,
          renewal_type: period,
        },
      }));

      toast({
        title: "Programa configurado",
        description: "Regra salva e programa disponível para uso.",
      });
      setAirlineId("");
      setCpfLimitInput("25");
      setPeriod("annual");
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      const errorMsg = err?.message || "Erro desconhecido";
      const errorCode = err?.code || "";
      toast({
        title: "Erro ao salvar regra",
        description: `${errorMsg}${errorCode ? ` (${errorCode})` : ""}`,
        variant: "destructive",
      });
    }
  };

  // Bulk edit: update rule in state
  const updateRule = (id: string, field: keyof ProgramRule, value: any) => {
    setRules((prev) => {
      const curr = prev[id] ?? {
        airline_id: id,
        cpf_limit: 25,
        renewal_type: "annual" as RenewalType,
      };
      const next: ProgramRule = {
        ...curr,
        [field]:
          field === "cpf_limit"
            ? normalizeLimit(Number(value))
            : (value as RenewalType),
      };
      return { ...prev, [id]: next };
    });
  };

  // Detect changes
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

  // Save all changes
  const handleSaveAll = async () => {
    if (diffToSave.length === 0) {
      toast({ title: "Nada para salvar", description: "Nenhuma alteração detectada." });
      return;
    }
    try {
      setSaving(true);
      const { supplierId } = await getSupplierId();

      for (const row of diffToSave) {
        // Save program rule
        await saveProgramRule({
          airline_id: row.id,
          cpf_limit: row.cpf_limit,
          renewal_type: row.renewal_type,
        });

        // Also ensure airline is linked in suppliers_airlines
        await supabase
          .from("suppliers_airlines")
          .upsert(
            {
              supplier_id: supplierId,
              airline_company_id: row.id,
            },
            { onConflict: "supplier_id,airline_company_id" }
          );
      }

      setOriginalRules(JSON.parse(JSON.stringify(rules)));
      toast({
        title: "Programas atualizados",
        description: "Todas as alterações salvas e disponíveis para uso.",
      });
    } catch (err: any) {
      console.error("Erro ao salvar em lote:", err);
      const errorMsg = err?.message || "Erro desconhecido";
      const errorCode = err?.code || "";
      toast({
        title: "Erro ao salvar regras",
        description: `${errorMsg}${errorCode ? ` (${errorCode})` : ""}`,
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
          <h1 className="text-3xl font-bold">Regras de Programas</h1>
          <p className="text-muted-foreground">
            Configure quais programas sua agência trabalha e defina regras padrão para cada um.
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Estas configurações serão aplicadas ao criar <b>novas</b> contas.
        </AlertDescription>
      </Alert>

      {/* Quick-add form */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Programa</CardTitle>
          <CardDescription>
            Adicione programas de fidelidade e configure as regras padrão
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3 items-start">
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <AirlineCombobox
                    options={options}
                    value={airlineId}
                    onChange={setAirlineId}
                    onCreate={handleComboboxCreate}
                    placeholder="Programa/Companhia Aérea"
                  />
                </div>
                <Button 
                  variant="secondary" 
                  onClick={handleCreateAirlineViaPrompt} 
                  title="Nova companhia aérea"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Dica: digite "NOME (CÓDIGO)" e clique em Adicionar. Exemplo: LATAM (LA)
              </p>
            </div>

            <Input
              placeholder="Limite de CPF"
              value={cpfLimitInput}
              onChange={(e) => setCpfLimitInput(e.target.value)}
              inputMode="numeric"
            />

            <Select value={period} onValueChange={(v: RenewalType) => setPeriod(v)}>
              <SelectTrigger><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">Anual (renova 1º jan)</SelectItem>
                <SelectItem value="rolling">Contínuo (1 ano do uso)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={addOrUpdateRule} disabled={!airlineId}>
            Salvar Regra
          </Button>
        </CardContent>
      </Card>

      {/* Bulk edit list */}
      <Card>
        <CardHeader>
          <CardTitle>Programas Ativos</CardTitle>
          <CardDescription>Estes programas estarão disponíveis ao criar contas e vendas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {airlines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma companhia aérea cadastrada. Use "Nova companhia aérea" para criar uma.
            </p>
          ) : (
            airlines.map((airline) => {
              const rule = rules[airline.id];
              return (
                <div key={airline.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="space-y-0.5">
                    <div className="font-medium">
                      {airline.name} ({airline.code})
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Limite CPF: <b>{rule?.cpf_limit ?? 25}</b> — Período:{" "}
                      <b>{(rule?.renewal_type ?? "annual") === "rolling" ? "Contínuo (1 ano)" : "Anual (1º jan)"}</b>
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <Input
                      className="w-24"
                      type="number"
                      min={1}
                      max={1000}
                      value={rule?.cpf_limit ?? 25}
                      onChange={(e) => updateRule(airline.id, "cpf_limit", e.target.value)}
                    />
                    <Select
                      value={rule?.renewal_type ?? "annual"}
                      onValueChange={(v: RenewalType) => updateRule(airline.id, "renewal_type", v)}
                    >
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Anual (1º jan)</SelectItem>
                        <SelectItem value="rolling">Contínuo (1 ano)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Cancelar
        </Button>
        <Button onClick={handleSaveAll} disabled={saving || diffToSave.length === 0}>
          <Save className="h-4 w-4 mr-2" />
          {saving
            ? "Salvando..."
            : diffToSave.length === 0
              ? "Sem alterações"
              : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
